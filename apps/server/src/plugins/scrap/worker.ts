import type { Setup } from 'server';
import type { DBTagData } from 'db/schema';
import type { DanbooruResponse } from '@boorugator/shared/types';

import { desc } from 'drizzle-orm';
import { db, schema as $s } from 'db';

import { random } from 'utils/common';
import { getDanbooruImage } from 'utils/danbooru';

import { log } from 'plugins/logger';
import { addTask } from 'plugins/ipx/lqip-worker';

export async function run(store_: unknown) {
  const { lqip_worker } = (store_ as CronStore)?.cron || {};
  const state = { last: (await findFirst.execute())?.id || 0, isEnd: false };

  while (!state.isEnd) {
    const delay = random(800, 1800);
    await new Promise<void>((res) => setTimeout(() => scrap(state).then(res), delay));
  }

  if (lqip_worker && !lqip_worker.isBusy()) {
    lqip_worker.trigger();
  }
}

async function scrap(state: State): Promise<void> {
  const res = await fetch(getDanbooruURL(state.last)).catch(() => null);
  if (!res?.ok) return;

  const data = (await res.json()) as DanbooruResponse[];
  if (!data || !Array.isArray(data) || data.length < 200) {
    state.isEnd = true;
    return;
  }

  const danbooruData = data
    .filter((d) => !!d.md5 && d.score > -1)
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
          has_notes: !!data.last_noted_at,
          file_size: data.file_size,
          uploader_id: data.uploader_id,
          created_at: new Date(data.created_at || Date.now()),
          ...getDanbooruImage(data),
          tags: {
            0: dedupe(data.tag_string_general),
            1: dedupe(data.tag_string_artist),
            3: dedupe(data.tag_string_copyright),
            4: dedupe(data.tag_string_character),
            5: dedupe(data.tag_string_meta),
          },
        }) satisfies Payload
    );
  if (danbooruData.length === 0) return;

  try {
    log('INFO', `[SCRAP] Processing batch: ${danbooruData[0]?.id} ${danbooruData.at(-1)?.id}`);

    await db.transaction(async (tx) => {
      const data: (typeof $s.postTable.$inferInsert)[] = [];
      const lqipTasks: Parameters<typeof addTask>[] = [];

      for (let i = 0; i < danbooruData.length; i++) {
        const { tags: t, ...rest } = danbooruData[i];

        const tagsMap = Object.entries(t).flatMap(([cat, t1]) =>
          t1.map((tagName) => ({ category: +cat, tagName }))
        );
        const tagsName = tagsMap.map((t) => t.tagName.slice(0, 100));

        let tag_ids: number[];
        let author_ids: number[] | null = null;

        const tagsFromDB = await tx.query.tagsTable.findMany({
          where: (table, { inArray }) => inArray(table.name, tagsName),
        });

        const insertTags = (data: TagInsert[]) =>
          tx
            .insert($s.tagsTable)
            .values(data)
            .returning({ id: $s.tagsTable.id })
            .then((res) => res.map((r) => r.id));

        if (tagsFromDB.length === 0) {
          const { tagsInsert, authorsInsert } = tagsName.reduce(
            (acc, name, i) => {
              const category = tagsMap[i].category;
              if (category === 1) acc.authorsInsert.push({ name, category });
              else acc.tagsInsert.push({ name, category });
              return acc;
            },
            { tagsInsert: [], authorsInsert: [] } as TagInsertMap
          );

          tag_ids = await insertTags(tagsInsert);

          if (authorsInsert.length > 0) {
            author_ids = await insertTags(authorsInsert);
          }
        } else {
          const { existingTags, existingAuthors } = tagsFromDB.reduce(
            (acc, tag) => {
              if (tag.category === 1) acc.existingAuthors.push(tag);
              else acc.existingTags.push(tag);
              return acc;
            },
            { existingTags: [], existingAuthors: [] } as ExistingTagsMap
          );

          const { tagsInsert, authorsInsert } = tagsName.reduce(
            (acc, name, i) => {
              const category = tagsMap[i].category;
              const existing = tagsFromDB.some((t) => t.name === name);

              if (!existing) {
                if (category === 1) acc.authorsInsert.push({ name, category });
                else acc.tagsInsert.push({ name, category });
              }

              return acc;
            },
            { tagsInsert: [], authorsInsert: [] } as TagInsertMap
          );

          if (tagsInsert.length > 0) {
            const inserted = await insertTags(tagsInsert);
            tag_ids = [...existingTags.map((t) => t.id), ...inserted];
          }

          if (authorsInsert.length > 0) {
            const inserted = await insertTags(authorsInsert);
            author_ids = [...existingAuthors.map((t) => t.id), ...inserted];
          } else if (existingAuthors.length > 0) {
            author_ids = existingAuthors.map((t) => t.id);
          }

          tag_ids ??= existingTags.map((t) => t.id);
        }

        data.push({ ...rest, tag_ids, author_ids });
        lqipTasks.push([rest.sample_url || rest.file_url, rest.hash]);
      }

      await tx
        .insert($s.postTable)
        .values(data)
        .then(() => lqipTasks.forEach(([url, hash]) => addTask(url, hash)));
    });

    state.last = danbooruData.at(-1)!.id;
  } catch (err) {
    console.error(Bun.inspect(err, { colors: true }));
  }
}

const findFirst = db.query.postTable.findFirst({ orderBy: desc($s.postTable.id) }).prepare('findFirstPost');

const dedupe = (tags: string) =>
  Array.from(new Set(tags.split(' ')))
    .map((t) => t.trim())
    .filter(Boolean);
const getDanbooruURL = (lastId: number) => {
  const url = new URL('https://danbooru.donmai.us/posts.json?limit=200');
  url.searchParams.set('page', `a${lastId}`);
  url.searchParams.set('login', Bun.env.DANBOORU_USER_ID || '');
  url.searchParams.set('api_key', Bun.env.DANBOORU_API_KEY || '');
  return url.toString();
};

type State = { last: number; isEnd: boolean };
type Payload = typeof $s.postTable.$inferInsert & { tags: Record<0 | 1 | 3 | 4 | 5, string[]> };
type TagInsert = typeof $s.tagsTable.$inferInsert;
type CronStore = Partial<Pick<Setup['store'], 'cron'>>;
type TagInsertMap = Record<'tagsInsert' | 'authorsInsert', TagInsert[]>;
type ExistingTagsMap = Record<'existingTags' | 'existingAuthors', DBTagData[]>;
