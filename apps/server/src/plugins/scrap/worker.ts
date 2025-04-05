import type { DanbooruResponse } from '@boorugator/shared/types';

import { desc } from 'drizzle-orm';
import { db, schema as $s } from 'db';

import { random } from 'utils/common';
import { getDanbooruImage } from 'utils/danbooru';

export async function run() {
  const state = { last: findFirst.all()?.id || 0, isEnd: false };
  while (!state.isEnd) {
    const delay = random(800, 1800);
    await new Promise<void>((res) => setTimeout(() => scrap(state).then(res), delay));
  }
}

async function scrap(state: State): Promise<void> {
  const res = await fetch(getDanbooruURL(state.last));
  if (!res.ok) return;

  const data = (await res.json()) as DanbooruResponse[];
  if (!data || !Array.isArray(data) || data.length === 0) {
    state.isEnd = true;
    return;
  }

  const danbooruData = data
    .reverse()
    .map(
      (data) =>
        ({
          id: data.id,
          hash: data.md5,
          score: data.score,
          source: data.source,
          rating: data.rating,
          pixiv_id: data.pixiv_id || null,
          parent_id: data.parent_id || null,
          artist_id: db
            .insert($s.tagsTable)
            .values({ name: data.tag_string_artist || 'artist_unknown', category: 1 })
            .onConflictDoUpdate({ target: $s.tagsTable.name, set: { category: 1 } })
            .returning({ id: $s.tagsTable.id })
            .get().id,
          has_notes: !!data.last_noted_at,
          file_size: data.file_size,
          uploader_id: data.uploader_id,
          created_at: new Date(data.created_at || Date.now()),
          ...getDanbooruImage(data),
          tags: Object.entries({
            0: data.tag_string_general,
            3: data.tag_string_copyright,
            4: data.tag_string_character,
            5: data.tag_string_meta,
          }).reduce(
            (acc, [cat, tags]) => {
              const split = !tags ? [`${getCategoryName(+cat)}_unknown`] : tags.split(' ');
              acc.push(...split.map((t) => ({ name: t, category: +cat })));
              return acc;
            },
            [] as (typeof $s.tagsTable.$inferInsert)[]
          ),
        }) satisfies Payload
    )
    .filter((d) => !!d.hash);
  if (danbooruData.length === 0) return;

  try {
    console.info('Processing batch:', danbooruData[0]?.id, danbooruData.at(-1)?.id);
    db.transaction((tx) => {
      tx.insert($s.postTable).values(danbooruData).onConflictDoNothing({ target: $s.postTable.id }).run();

      for (const { id, tags } of danbooruData) {
        const initTagName = tags.map((t) => t.name).filter(Boolean);
        const existingTags = tx.query.tagsTable
          .findMany({ where: (tagsTable, { inArray }) => inArray(tagsTable.name, initTagName) })
          .sync()
          .map((t) => t.name);
        const lastTagId =
          tx.query.tagsTable.findFirst({ orderBy: (t, { desc }) => desc(t.id) }).sync()?.id || 0;
        const filteredTags = tags
          .filter((t) => !existingTags.includes(t.name))
          .map((t, i) => ({ ...t, id: lastTagId + i + 1 }));
        if (filteredTags.length > 0) tx.insert($s.tagsTable).values(filteredTags).run();

        const tagNames = tags.map((t) => t.name);
        const postTags = tx.query.tagsTable
          .findMany({ where: (table, { inArray }) => inArray(table.name, tagNames) })
          .sync();
        const mappedTags = postTags.reduce(
          (acc, next) => {
            const data = (acc[next.category as 0] ??= new Set());
            data.add(next.id);
            return acc;
          },
          <Record<0 | 1 | 2 | 3 | 4 | 5, Set<number>>>{}
        );

        Object.entries(mappedTags).forEach(([c, ids]) => {
          const cat = +c as keyof typeof mappedTags;
          const tagIds = Array.from(ids);
          if (isTagRel(cat)) {
            const data = tagIds.map((t) => ({ post_id: id, tag_id: t }));
            if (data.length > 0) tx.insert(getPostTagsRel(cat)).values(data).run();
          } else {
            const common = tagIds.filter((id) => id <= 800);
            const uncommon = tagIds.filter((id) => id > 800);
            if (common.length > 0)
              tx.insert($s.commonTags)
                .values(common.map((t) => ({ post_id: id, tag_id: t })))
                .run();
            if (uncommon.length > 0)
              tx.insert($s.uncommonTags)
                .values(uncommon.map((t) => ({ post_id: id, tag_id: t })))
                .run();
          }
        });
      }
    });
    state.last = danbooruData.at(-1)!.id;
  } catch (err) {
    console.error(Bun.inspect(err, { colors: true }));
  }
}

const findFirst = db.query.postTable.findFirst({ orderBy: desc($s.postTable.id) }).prepare();

const isTagRel = (cat: number): cat is TagRelKey => !Number.isNaN(cat) && [3, 4, 5].includes(cat);
const getPostTagsRel = <T extends TagRelKey>(category: T) =>
  ({ 3: $s.metaTags, 4: $s.characterTags, 5: $s.metaTags })[category];
const getCategoryName = (cat: number) => (cat == 4 ? 'character' : cat == 3 ? 'copyright' : 'untagged');
const getDanbooruURL = (lastId: number) => {
  const url = new URL('https://danbooru.donmai.us/posts.json?limit=200');
  url.searchParams.set('page', `a${lastId}`);
  url.searchParams.set('login', Bun.env.DANBOORU_USER_ID || '');
  url.searchParams.set('api_key', Bun.env.DANBOORU_API_KEY || '');
  return url.toString();
};

type State = { last: number; isEnd: boolean };
type Payload = typeof $s.postTable.$inferInsert & { tags: (typeof $s.tagsTable.$inferInsert)[] };
type TagRelKey = 3 | 4 | 5;
