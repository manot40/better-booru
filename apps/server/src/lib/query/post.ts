import type { SQL } from 'drizzle-orm';
import type { DBPostData } from 'db/schema';

import { db, schema as $s } from 'db';

import { arrayContains, arrayOverlaps } from 'drizzle-orm';

import { deserializeTags } from './helpers/common';
import { file_url, preview_url, sample_url } from './helpers/file-url-builder';

import { and, asc, desc, eq, getTableColumns, gt, inArray, lt, notInArray, sql } from 'drizzle-orm';

export async function queryPosts(qOpts: QueryOptions) {
  const opts = { ...qOpts, tags: qOpts.tags || [], limit: Math.min(qOpts.limit || 50, 500) };
  opts.page ||= '1';

  let isAsc = false;
  let offset = 0;
  let cursor: SQL | undefined;
  const whereParams: SQL[] = [];

  // Page Filter
  if (Number.isNaN(+opts.page)) {
    const pageNum = +opts.page.slice(1);
    isAsc = opts.page.startsWith('a');
    cursor = (isAsc ? gt : lt)($s.postTable.id, pageNum);
  } else if (+opts.page > 1 && +opts.page <= 200000) {
    offset = (+opts.page - 1) * opts.limit;
  }

  // Rating Filter
  if (opts.rating) {
    const rating = opts.rating as MaybeArray<DBPostData['rating']>;
    const filter = Array.isArray(rating)
      ? inArray($s.postTable.rating, rating)
      : eq($s.postTable.rating, rating);
    whereParams.push(filter);
  }

  const { post, count } = await db.transaction(async (tx) => {
    /** Posts Ordering */
    const order = (isAsc ? asc : desc)($s.postTable.id);

    /** Tags Filter */
    const filters = await deserializeTags(tx, opts.tags);
    // Equality Filter
    if (filters.eq) {
      whereParams.push(arrayContains($s.postTable.tag_ids, filters.eq));
    }
    // Inequality Filter
    if (filters.ne) {
      const exclusion = tx
        .select({ id: $s.postTable.id })
        .from($s.postTable)
        .where(and(cursor, arrayOverlaps($s.postTable.tag_ids, filters.ne)))
        .orderBy(order)
        .limit(opts.limit * 100);
      whereParams.push(notInArray($s.postTable.id, exclusion));
    }

    const { tag_ids: _, ...cols } = getTableColumns($s.postTable);
    const post = await tx
      .select({ ...cols, file_url, preview_url, sample_url })
      .from($s.postTable)
      .where(and(cursor, ...whereParams))
      .orderBy(order)
      .limit(opts.limit)
      .offset(offset);

    const count = !opts.tags?.length && !opts.rating ? postsCount : 0;
    return { post, count };
  });

  return { meta: { limit: opts.limit, count, offset }, post };
}

let postsCount = 0;

if (db.enabled) {
  const countPosts = db.select({ count: sql<number>`COUNT(${$s.postTable.id})` }).from($s.postTable);
  const setCount = () => countPosts.then(([{ count }]) => (postsCount = count));
  setInterval(setCount, 60 * 60 * 1000);
  setCount();
}

export interface QueryOptions {
  /** `a` for after and `b` for before specific id */
  page: StringHint<`${number}` | `a${number}` | `b${number}`>;
  tags?: Array<`-${string}` | (string & {})>;
  /** default 50 */
  limit?: number;
  rating?: MaybeArray<StringHint<DBPostData['rating']>>;
}
