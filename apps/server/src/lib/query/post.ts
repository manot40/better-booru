import type { SQL } from 'drizzle-orm';
import type { DBPostData } from 'db/schema';

import { SQLiteStore } from 'lib/cache/sqlite';
import { waitForWorker } from 'utils/worker';
import { db, schema as $s } from 'db';

import * as fileUrl from './helpers/file-url-builder';
import { deserializeTags } from './helpers/common';
import { populatePreviewCache } from './helpers/cache';

import {
  and,
  arrayContains,
  arrayOverlaps,
  asc,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  lt,
  notInArray,
  sql,
} from 'drizzle-orm';

const SAFE_OFFSET = 1000000;

export async function queryPosts(qOpts: QueryOptions) {
  const opts = { ...qOpts, tags: qOpts.tags || [], limit: Math.min(qOpts.limit || 50, 500) };
  opts.page ||= '1';

  let isAsc = false;
  let offset = 0;
  let cursor = [] as [SQL?, SQL?];
  const filters: SQL[] = [];

  // Page Filter
  if (Number.isNaN(+opts.page)) {
    const pageNum = +opts.page.slice(1);
    isAsc = opts.page.startsWith('a');
    cursor = isAsc
      ? [gt($s.postTable.id, pageNum), lt($s.postTable.id, pageNum + SAFE_OFFSET)]
      : [lt($s.postTable.id, pageNum), gt($s.postTable.id, pageNum - SAFE_OFFSET)];
  } else if (+opts.page > 1 && +opts.page <= 200000) {
    offset = (+opts.page - 1) * opts.limit;
  }

  // Rating Filter
  if (opts.rating) {
    const rating = opts.rating as MaybeArray<DBPostData['rating']>;
    const filter = Array.isArray(rating)
      ? inArray($s.postTable.rating, rating)
      : eq($s.postTable.rating, rating);
    filters.push(filter);
  }

  const { post, count } = await db.transaction(async (tx) => {
    /** Posts Ordering */
    const order = (isAsc ? asc : desc)($s.postTable.id);

    /** Tags Filter */
    const tags = await deserializeTags(tx, opts.tags);
    // Equality Filter
    if (tags.eq) {
      filters.push(arrayContains($s.postTable.tag_ids, tags.eq));
    }
    // Inequality Filter
    if (tags.ne) {
      const exclusion = tx
        .select({ id: $s.postTable.id })
        .from($s.postTable)
        .where(and(...cursor, arrayOverlaps($s.postTable.tag_ids, tags.ne)))
        .orderBy(order)
        .limit(opts.limit * 60);
      filters.push(notInArray($s.postTable.id, exclusion));
    }

    const { tag_ids: _, ...cols } = getTableColumns($s.postTable);
    const post = await tx
      .select({ ...cols, ...fileUrl })
      .from($s.postTable)
      .where(and(...cursor, ...filters))
      .orderBy(order)
      .limit(opts.limit)
      .offset(offset);

    post.forEach(populatePreviewCache);

    return { post, count: tags.ne ? 0 : getPostCount(filters, order) };
  });

  return { meta: { limit: opts.limit, count, offset }, post };
}

const countCache = new SQLiteStore('.data/count_cache.db');
export function getPostCount(filters: SQL[], order: SQL): number {
  const rows = db.$with('post_rows').as((qb) =>
    qb
      .select({ id: $s.postTable.id })
      .from($s.postTable)
      .where(and(...filters))
      .orderBy(order)
      .limit(SAFE_OFFSET)
  );
  const query = db
    .with(rows)
    .select({ count: sql<number>`COUNT(*)`.as('count') })
    .from(rows);

  const cacheKey = query.toSQL().params.join('|');
  const lockKey = `${cacheKey}-countLock`;

  const lock = countCache.get(lockKey);
  const cached = countCache.get(cacheKey);

  if (cached) return +cached;
  else if (lock) return 0;

  countCache.set(lockKey, '1', 60);
  waitForWorker<{ count: string }[]>({ op: 'DB_OPERATION', payload: query.toSQL() })
    .then(({ data, error, worker }) => {
      if (data) countCache.set(cacheKey, data[0].count, 60 * 60 * 24);
      else console.error(error || 'Count data cannot be retrieved');
      worker.terminate();
    })
    .catch((e) => console.error(e.message))
    .finally(() => countCache.delete(lockKey));

  return 0;
}

export interface QueryOptions {
  /** `a` for after and `b` for before specific id */
  page: StringHint<`${number}` | `a${number}` | `b${number}`>;
  tags?: Array<`-${string}` | (string & {})>;
  /** default 50 */
  limit?: number;
  rating?: MaybeArray<StringHint<DBPostData['rating']>>;
}
