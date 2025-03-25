import type { SQL } from 'drizzle-orm';
import type { DanbooruData } from '~~/server/db/schema';

import { db, schema as $s } from '~~/server/db';

import { and, desc, exists, gt, lt, eq, ne, getTableColumns, sql, inArray } from 'drizzle-orm';

let postsCount = 0;
setInterval(() => countPosts.execute().then(([{ count }]) => (postsCount = count)), 60000);

export async function queryPosts(qOpts: QueryOptions) {
  const opts = { limit: 50, order: '-id', ...qOpts };
  opts.tags ||= [];
  opts.page ||= '1';

  let offset = 0;
  let whereParams: SQL[] = [];
  let orderParams: SQL[] = [];

  // Page filter
  if (Number.isNaN(+opts.page)) {
    const pageNum = +opts.page.slice(1);
    whereParams.push((opts.page.startsWith('a') ? gt : lt)($s.postTable.id, pageNum));
  } else if (+opts.page > 1) {
    offset = (+opts.page - 1) * opts.limit;
  }

  const tagsFilter = opts.tags.map((t) =>
    t.startsWith('-') ? ne($s.tagsTable.name, t.slice(1)) : eq($s.tagsTable.name, t)
  );

  const { post, count } = await db.transaction(async (tx) => {
    let count = postsCount;
    const tCount = (tagIds: number[]) =>
      tx
        .select({ count: sql<number>`COUNT(*)` })
        .from($s.postsWithTags)
        .where(inArray($s.postsWithTags.tag_id, tagIds))
        .groupBy($s.postsWithTags.tag_id)
        .then((r) => r.reduce((acc, v) => acc + v.count, 0));
    const queryTags = (tags: string[]) =>
      tx
        .select({ id: $s.tagsTable.id })
        .from($s.tagsTable)
        .where(inArray($s.tagsTable.name, tags))
        .then((r) => r.map((t) => t.id));

    if (opts.tags && opts.tags.length > 0) {
      const neTags = opts.tags.filter((t) => t.startsWith('-'));
      const eqTagIds = await queryTags(opts.tags.filter((t) => !t.startsWith('-')));

      let eqCount = await tCount(eqTagIds);
      if (neTags.length > 0) {
        const neTagIds = await queryTags(neTags);
        eqCount -= await tCount(neTagIds);
      }

      count = eqCount;
    }

    const post = await tx
      .select({
        ...getTableColumns($s.postTable),
        tags: sql<string>`COALESCE(group_concat("tags"."name", ' '),'')`,
        tags_meta: groupedTags(5),
        tags_artist: groupedTags(1),
        tags_general: groupedTags(0),
        tags_character: groupedTags(4),
        tags_copyright: groupedTags(3),
      })
      .from($s.postTable)
      .leftJoin($s.postsWithTags, eq($s.postTable.id, $s.postsWithTags.post_id))
      .leftJoin($s.tagsTable, and(eq($s.postsWithTags.tag_id, $s.tagsTable.id)))
      .where(
        exists(
          tx
            .select()
            .from($s.postsWithTags)
            .innerJoin($s.tagsTable, eq($s.postsWithTags.tag_id, $s.tagsTable.id))
            .where(and(eq($s.postsWithTags.post_id, $s.postTable.id), ...tagsFilter))
        )
      )
      .groupBy(sql`${$s.postTable.id}`)
      .orderBy(...orderParams)
      .limit(opts.limit)
      .offset(offset);

    return { post, count };
  });

  return { meta: { limit: opts.limit, count, offset }, post };
}

const countPosts = db
  .select({ count: sql<number>`COUNT("id")` })
  .from($s.postTable)
  .prepare('countPosts');
const groupedTags = (cat: number) =>
  sql<string>`COALESCE(GROUP_CONCAT(CASE WHEN ${eq($s.tagsTable.category, cat)} THEN ${
    $s.tagsTable.name
  } END,' '),'')`;

export interface QueryOptions {
  /** `a` for after and `b` for before specific id */
  page: `${number}` | `a${number}` | `b${number}`;
  tags: Array<`-${string}` | (string & {})>;
  /** default 50 */
  limit?: number;
  order?: MaybeArray<`-${keyof DanbooruData}` | keyof DanbooruData>;
  rating?: MaybeArray<DanbooruData['rating']>;
}
