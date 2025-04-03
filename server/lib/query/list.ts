import type { SQL } from 'drizzle-orm';
import type { DBPostData, PostRelations } from '~~/server/db/schema';

import { db, schema as $s } from '~~/server/db';

import { and, desc, gt, lt, asc, getTableColumns, eq, inArray, notExists, ne, sql } from 'drizzle-orm';

import { file_url, preview_url, sample_url } from './file-url-builder';
import { createFilterEq, deserializeTags, getPostTagsRel } from './common';
import { TagCategoryID } from '~~/types/common';
import { getPostCount } from './count';

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

  // Tags Filter
  whereParams.push(...generateTagsFilter(opts.tags));

  const { post, count } = db.transaction((tx) => {
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

export function generateTagsFilter(tags: string[]) {
  const params = <SQL[]>[];
  const tagsFilter = deserializeTags(tags);

  if (tagsFilter.eq) {
    const filterOp = Object.entries(tagsFilter.eq)
      .map(([c, ids]) => {
        const cat = +c as TagCategoryID;
        if (!ids) return;
        else if (cat == 1) params.push(eq($s.postTable.artist_id, <number>ids[0]));
        else return createFilterEq(cat, ids);
      })
      .filter(Boolean)
      .flat();
    if (filterOp.length) {
      // @ts-ignore
      const intersects = filterOp.reduce((op, next) => op!.intersect(next));
      if (intersects) params.push(inArray($s.postTable.id, intersects));
    }
  }

  if (tagsFilter.ne) {
    const filterOp = Object.entries(tagsFilter.ne)
      .map(([c, ids]) => {
        const cat = +c as TagCategoryID;
        if (!ids) return;

        const createQuery = <R extends PostRelations>(rel: R, ids: number[]) =>
          db
            .select({ '1': sql`1` })
            .from(rel)
            .where(and(eq(rel.post_id, $s.postTable.id), inArray(rel.tag_id, ids)));

        if (cat == 1) {
          params.push(ne($s.postTable.artist_id, <number>ids[0]));
          return;
        } else if (cat === 0 || cat === 2) {
          const q = <ReturnType<typeof createQuery>[]>[];
          const common = ids.filter((id) => id <= 800);
          const uncommon = ids.filter((id) => id > 800);
          if (common.length > 0) q.push(createQuery($s.commonTags, common));
          if (uncommon.length > 0) q.push(createQuery($s.uncommonTags, uncommon));
          return q;
        } else return createQuery(getPostTagsRel(cat), ids);
      })
      .filter(Boolean)
      .flat();
    if (filterOp.length) {
      // @ts-ignore
      const union = filterOp.reduce((op, next) => op!.union(next));
      if (union) params.push(notExists(union));
    }
  }

  return params;
}

export interface QueryOptions {
  /** `a` for after and `b` for before specific id */
  page: `${number}` | `a${number}` | `b${number}`;
  tags?: Array<`-${string}` | (string & {})>;
  /** default 50 */
  limit?: number;
  rating?: MaybeArray<StringHint<DBPostData['rating']>>;
}
