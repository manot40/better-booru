import type { TagCategoryID } from '@boorugator/shared/types';

import cache from '../cache';

import { db, schema as $s } from 'db';
import { and, eq, inArray, notInArray, sql, type SQL } from 'drizzle-orm';

import { createFilterEq, deserializeTags, type Transaction } from './common';

export function getPostCount(tx: Transaction, tags: string[], rating?: MaybeArray<'g' | 's' | 'q' | 'e'>) {
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
      const filterOp = Object.entries(s)
        .map(([c, ids]) => {
          const cat = +c as TagCategoryID;
          if (!ids) return;
          else if (cat == 1) params.push(eq($s.postTable.artist_id, <number>ids[0]));
          else return createFilterEq(cat, ids, tx);
        })
        .filter(Boolean)
        .flat();

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

export let postsCount = 0;

if (db.enabled) {
  const countPosts = db.select({ count: sql<number>`COUNT(${$s.postTable.id})` }).from($s.postTable);
  const setCount = () => (postsCount = countPosts.get()?.count || 0);
  setInterval(setCount, 60000);
  setCount();
}
