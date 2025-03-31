import type { PostRelations } from '../db/schema';
import type { TagCategoryID } from '~~/types/common';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type { SQL, ExtractTablesWithRelations } from 'drizzle-orm';

import cache from './cache';
import { db, schema as $s } from '../db';

import { and, eq, notExists, sql, inArray, ne, notInArray } from 'drizzle-orm';

export function generateTagsFilter(tx: Transaction, tags: string[]) {
  const params = <SQL[]>[];
  const tagsFilter = deserializeTags(tags);

  if (tagsFilter.eq) {
    const filterOp = Object.entries(tagsFilter.eq)
      .map(([c, ids]) => {
        const cat = +c as TagCategoryID;
        if (!ids) return;
        else if (cat == 1) params.push(eq($s.postTable.artist_id, <number>ids[0]));
        else return createFilterEq(tx, cat, ids);
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
          tx
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
          else return createFilterEq(tx, cat, ids);
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

export function queryPostTags(post_id: number) {
  const unions = db
    .select({ tag_id: $s.metaTags.tag_id })
    .from($s.metaTags)
    .where(eq($s.metaTags.post_id, post_id))
    .union(
      db
        .select({ tag_id: $s.characterTags.tag_id })
        .from($s.characterTags)
        .where(eq($s.characterTags.post_id, post_id))
    )
    .union(
      db
        .select({ tag_id: $s.commonTags.tag_id })
        .from($s.commonTags)
        .where(eq($s.commonTags.post_id, post_id))
    )
    .union(
      db
        .select({ tag_id: $s.uncommonTags.tag_id })
        .from($s.uncommonTags)
        .where(eq($s.uncommonTags.post_id, post_id))
    );
  const query = db.query.tagsTable.findMany({
    where: (t, { inArray }) => inArray(t.id, unions),
    orderBy: (t, { asc }) => [asc(t.category), asc(t.name)],
  });

  return query.sync();
}

function createFilterEq(tx: Transaction, cat: 0 | 2 | 3 | 4 | 5, ids: number[]) {
  if (cat === 0 || cat === 2) {
    const q = <ReturnType<typeof createRelationQuery>[]>[];
    const common = ids.filter((id) => id <= 800);
    const uncommon = ids.filter((id) => id > 800);
    if (common.length > 0) q.push(createRelationQuery($s.commonTags, common));
    if (uncommon.length > 0) q.push(createRelationQuery($s.uncommonTags, uncommon));
    return q;
  } else return [createRelationQuery(getPostTagsRel(cat), ids)];

  function createRelationQuery<R extends PostRelations>(rel: R, ids: number[]) {
    const selection = tx.select({ post_id: rel.post_id }).from(rel);
    return selection
      .where(inArray(rel.tag_id, ids))
      .groupBy(rel.post_id)
      .having(sql`count(${rel.tag_id}) = ${ids.length}`);
  }
}

function deserializeTags(tags: string[]) {
  const tagByName = db
    .select()
    .from($s.tagsTable)
    .where(eq($s.tagsTable.name, sql.placeholder('tag')))
    .prepare();

  return tags
    .map((t) => {
      const exc = /^-/.test(t);
      const tag = exc ? t.slice(1) : t;
      return { exc, tag: tagByName.get({ tag }) };
    })
    .reduce(
      (t, { exc, tag }, i) => {
        if (!tag) return t;
        const mod = (t[exc ? 'ne' : 'eq'] ||= {} as Record<TagCategoryID, number[]>);
        (mod[tag.category as TagCategoryID] ||= []).push(tag.id);

        if (i === tags.length - 1)
          Object.values(t).forEach((obj) => {
            if (obj) Object.values(obj).forEach((val) => val && val.sort((a, b) => a - b));
          });

        return t;
      },
      <Record<'eq' | 'ne', Record<TagCategoryID, number[] | undefined> | undefined>>{}
    );
}

export let postsCount = 0;
if (db.enabled) {
  const countPosts = db.select({ count: sql<number>`COUNT(${$s.postTable.id})` }).from($s.postTable);
  const setCount = () => (postsCount = countPosts.get()?.count || 0);
  setInterval(setCount, 60000);
  setCount();
}

const getPostTagsRel = <T extends 3 | 4 | 5>(category: T) =>
  ({ 3: $s.metaTags, 4: $s.characterTags, 5: $s.metaTags })[category];

type Transaction = SQLiteTransaction<'sync', void, typeof $s, ExtractTablesWithRelations<typeof $s>>;
