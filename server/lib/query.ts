import type { SQL } from 'drizzle-orm';
import type { DBPostData } from '~~/server/db/schema';

import { db, schema as $s } from '~~/server/db';

import { and, desc, gt, lt, asc } from 'drizzle-orm';
import { generateTagsFilter, getCountFromTags } from './helpers';

export async function queryPosts(qOpts: QueryOptions) {
  const opts = { limit: 50, ...qOpts };
  opts.tags ||= [];
  opts.page ||= '1';

  let isAsc = false;
  let offset = 0;
  const whereParams: SQL[] = [];

  // Page filter
  if (Number.isNaN(+opts.page)) {
    const pageNum = +opts.page.slice(1);
    isAsc = opts.page.startsWith('a');
    whereParams.push((isAsc ? gt : lt)($s.postTable.id, pageNum));
  } else if (+opts.page > 1) {
    offset = (+opts.page - 1) * opts.limit;
  }

  const { post, count } = db.transaction((tx) => {
    // Tags Filter
    whereParams.push(...generateTagsFilter(tx, opts.tags));

    const op = tx
      .select()
      .from($s.postTable)
      .where(and(...whereParams))
      .orderBy((isAsc ? asc : desc)($s.postTable.id))
      .limit(opts.limit)
      .offset(offset);

    return { post: op.all(), count: getCountFromTags(tx, opts.tags) };
  });

  return { meta: { limit: opts.limit, count, offset }, post };
}

export interface QueryOptions {
  /** `a` for after and `b` for before specific id */
  page: `${number}` | `a${number}` | `b${number}`;
  tags: Array<`-${string}` | (string & {})>;
  /** default 50 */
  limit?: number;
  rating?: MaybeArray<DBPostData['rating']>;
}
