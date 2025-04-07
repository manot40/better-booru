import type { SQL } from 'drizzle-orm';
import type { TagCategoryID } from '@boorugator/shared/types';
import type { DanbooruTags, DBPostData, PostRelations } from 'db/schema';

import cache from 'lib/cache';
import { db, schema as $s } from 'db';

import { file_url, preview_url, sample_url } from './helpers/file-url-builder';
import { deserializeTags, getRangeFilter, type Transaction } from './helpers/common';
import { createRelationFilterFn, generateTagsFilterQuery } from './helpers/tags-filter';

import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  lt,
  ne,
  notInArray,
  notExists,
  sql,
} from 'drizzle-orm';

export function queryPosts(qOpts: QueryOptions) {
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
  whereParams.push(...generateTagsFilter(opts.tags, opts.page, opts.expensive));

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
    console.log(op.toSQL());
    const count = opts.expensive ? 0 : getPostCount(tx, opts.tags, opts.rating as 'g');
    return { post: op.all(), count };
  });

  return { meta: { limit: opts.limit, count, offset }, post };
}

function getPostCount(tx: Transaction, tags: string[], rating?: MaybeArray<'g' | 's' | 'q' | 'e'>) {
  if (!tags.length && !rating?.length) return postsCount;

  const hasRating = !!rating?.length && (!Array.isArray(rating) || rating.length <= 4);
  const cacheKey = `rating_${hasRating ? rating : 'all'}|count_${[...tags].sort()}`;
  if (cache.has(cacheKey)) return cache.get<number>(cacheKey);

  const params = <SQL[]>[];

  if (hasRating) {
    const col = $s.postTable.rating;
    params.push(Array.isArray(rating) ? inArray(col, rating) : eq(col, rating));
  }
  if (tags.length) {
    Object.entries(deserializeTags(tags)).forEach(([key, s]) => {
      if (!s) return;
      const filterFn = createRelationFilterFn(tx);
      const filterOp = Object.entries(s).flatMap(([c, ids]) => {
        const cat = +c as TagCategoryID;
        if (ids && cat == 1) params.push(eq($s.postTable.artist_id, <number>ids[0]));
        else if (ids) return generateTagsFilterQuery(filterFn, cat, ids);
        return [];
      });
      if (filterOp.length > 0) {
        // @ts-ignore
        const set = filterOp.reduce((op, next) => op![key == 'ne' ? 'union' : 'intersect'](next));
        if (set) params.push((key == 'ne' ? notInArray : inArray)($s.postTable.id, set));
      }
    });
  }

  const count = tx
    .select({ count: sql<number>`COUNT(${$s.postTable.id})` })
    .from($s.postTable)
    .where(and(...params))
    .get()?.count!;

  cache.set(cacheKey, count);
  return count;
}

function generateTagsFilter(tags: string[], page?: string, expensiveTags?: DanbooruTags[]) {
  const params = <SQL[]>[];
  const tagsFilter = deserializeTags(tags);
  const SAFE_OFFSET = 300000;

  /** Calculate cursor range to help ease the query */
  let range: [number, number] | undefined;
  if (page) {
    const t = page.slice(0, 1);
    if (Number.isNaN(+t)) {
      const targetId = +page.slice(1);
      if (t === 'a') range = [targetId + SAFE_OFFSET, targetId];
      else if (t === 'b') range = [targetId, Math.max(targetId - SAFE_OFFSET, 0)];
    } else {
      // TODO
    }
  }

  if (tagsFilter.eq) {
    const complex = Object.values(tagsFilter.eq).flat().filter(Boolean).length > 3;
    const expensivenes = expensiveTags ? { complex, tags: expensiveTags } : undefined;

    const filterFn = createRelationFilterFn(db, range, expensivenes);
    const filterOp = Object.entries(tagsFilter.eq).flatMap(([c, ids]) => {
      const cat = +c as TagCategoryID;
      if (cat == 1 && ids) params.push(eq($s.postTable.artist_id, <number>ids[0]));
      else if (ids) return generateTagsFilterQuery(filterFn, cat, ids);
      return [];
    });
    if (filterOp.length) {
      // @ts-ignore
      const intersects = filterOp.reduce((op, next) => op!.intersect(next));
      if (intersects) params.push(inArray($s.postTable.id, intersects));
    }
  }

  if (tagsFilter.ne) {
    const filterOp = Object.entries(tagsFilter.ne).flatMap(([c, ids]) => {
      const cat = +c as TagCategoryID;
      if (ids && cat == 1) params.push(ne($s.postTable.artist_id, <number>ids[0]));
      else if (ids) return generateTagsFilterQuery(filterFn, cat, ids);
      return [];
    });
    if (filterOp.length) {
      // @ts-ignore
      const union = filterOp.reduce((op, next) => op!.union(next));
      if (union) params.push(notExists(union));
    }
    function filterFn<R extends PostRelations>(rel: R, ids: number[]) {
      const cursorFilter = range ? getRangeFilter(rel, range) : [];
      return db
        .select({ '1': sql`1` })
        .from(rel)
        .where(and(...cursorFilter, eq(rel.post_id, $s.postTable.id), inArray(rel.tag_id, ids)));
    }
  }

  return params;
}

let postsCount = 0;

if (db.enabled) {
  const countPosts = db.select({ count: sql<number>`COUNT(${$s.postTable.id})` }).from($s.postTable);
  const setCount = () => (postsCount = countPosts.get()?.count || 0);
  setInterval(setCount, 60000);
  setCount();
}

export interface QueryOptions {
  /** `a` for after and `b` for before specific id */
  page: StringHint<`${number}` | `a${number}` | `b${number}`>;
  tags?: Array<`-${string}` | (string & {})>;
  /** default 50 */
  limit?: number;
  rating?: MaybeArray<StringHint<DBPostData['rating']>>;
  expensive?: DanbooruTags[];
}
