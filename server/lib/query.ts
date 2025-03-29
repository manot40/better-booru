import type { SQL } from 'drizzle-orm';
import type { DBPostData } from '~~/server/db/schema';

import { db, schema as $s } from '~~/server/db';

import { and, desc, gt, lt, asc, getTableColumns, eq, inArray } from 'drizzle-orm';
import { generateTagsFilter, getPostCount } from './helpers';

import { file_url, preview_url, sample_url } from './file-url-builder';

export async function queryPosts(qOpts: QueryOptions) {
  const opts = { ...qOpts, tags: qOpts.tags || [], limit: Math.min(qOpts.limit || 50, 500) };
  opts.page ||= '1';

  let isAsc = false;
  let offset = 0;
  const whereParams: SQL[] = [];

  // Page Filter
  if (Number.isNaN(+opts.page)) {
    const pageNum = +opts.page.slice(1);
    isAsc = opts.page.startsWith('a');
    whereParams.push((isAsc ? gt : lt)($s.postTable.id, pageNum));
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

  const { post, count } = db.transaction((tx) => {
    // Tags Filter
    whereParams.push(...generateTagsFilter(tx, opts.tags));

    const { artist_id: _, ...cols } = getTableColumns($s.postTable);
    const op = tx
      .select({ ...cols, artist: $s.tagsTable.name, file_url, sample_url, preview_url })
      .from($s.postTable)
      .leftJoin($s.tagsTable, eq($s.tagsTable.id, $s.postTable.artist_id))
      .where(and(...whereParams))
      .orderBy((isAsc ? asc : desc)($s.postTable.id))
      .limit(opts.limit)
      .offset(offset);

    return { post: op.all(), count: getPostCount(tx, opts.tags, opts.rating as 'g') };
  });

  return { meta: { limit: opts.limit, count, offset }, post };
}

export interface QueryOptions {
  /** `a` for after and `b` for before specific id */
  page: `${number}` | `a${number}` | `b${number}`;
  tags?: Array<`-${string}` | (string & {})>;
  /** default 50 */
  limit?: number;
  rating?: MaybeArray<StringHint<DBPostData['rating']>>;
}
