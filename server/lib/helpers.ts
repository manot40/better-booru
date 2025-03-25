import type { TagCategoryID } from '~~/types/common';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type { SQL, ExtractTablesWithRelations } from 'drizzle-orm';

import cache from './cache';
import { db, schema as $s } from '../db';

import { and, eq, notExists, sql, inArray, ne } from 'drizzle-orm';

export function generateTagsFilter(tx: Transaction, tags: string[]) {
  const params = <SQL[]>[];
  const tagsFilter = deserializeTags(tags);

  if (tagsFilter.eq) {
    const filterOp = Object.entries(tagsFilter.eq).map(([c, ids]) => {
      const cat = +c as TagCategoryID;
      if (!ids) return;
      else if (cat == 1) params.push(eq($s.postTable.artist_id, ids[0]));
      else return createFilterEq(tx, cat, ids);
    });
    // @ts-ignore
    const intersects = filterOp.filter(Boolean).reduce((op, next) => op!.intersect(next));
    if (intersects) params.push(inArray($s.postTable.id, intersects));
  }

  if (tagsFilter.ne) {
    const filterOp = Object.entries(tagsFilter.ne).map(([c, ids]) => {
      const cat = +c as TagCategoryID;
      if (!ids) return;

      if (cat == 1) {
        params.push(ne($s.postTable.artist_id, ids[0]));
        return;
      }

      const rel = getPostTagsRel(cat);
      return tx
        .select({ '1': sql`1` })
        .from(rel)
        .where(and(eq(rel.post_id, $s.postTable.id), inArray(rel.tag_id, ids)));
    });
    // @ts-ignore
    const union = filterOp.filter(Boolean).reduce((op, next) => op!.union(next));
    if (union) params.push(notExists(union));
  }

  return params;
}

export function getCountFromTags(tx: Transaction, tags: string[]) {
  const tagsFilter = deserializeTags(tags);

  let countEq = 0;
  let countNe: number | undefined;
  const flatTags = [...Object.values(tagsFilter.eq || {}), ...Object.values(tagsFilter.ne || {})].flat();
  const cacheKey = `count_${flatTags.join(',')}`;

  if (tags.length && cache.has(cacheKey)) return cache.get<number>(cacheKey);

  Object.entries(tagsFilter).forEach(([key, s]) => {
    if (!s) return;
    const params = <SQL[]>[];
    const filterOp = Object.entries(s).map(([c, ids]) => {
      const cat = +c as TagCategoryID;
      if (!ids) return;
      else if (cat == 1) params.push(eq($s.postTable.artist_id, ids[0]));
      else return createFilterEq(tx, cat, ids);
    });
    // @ts-ignore
    const intersects = filterOp.filter(Boolean).reduce((op, next) => op!.intersect(next));
    if (intersects) params.push(inArray($s.postTable.id, intersects));
    const count = tx
      .select({ count: sql<number>`COUNT(${$s.postTable.id})` })
      .from($s.postTable)
      .where(and(...params))
      .get()?.count;

    if (key === 'ne') countNe = count;
    else if (typeof count == 'number') countEq = count;
  });

  let count;
  if (typeof countNe == 'number') count = postsCount - countNe + countEq;
  else count = countEq;

  if (tags.length) cache.set(cacheKey, count);
  return count;
}

function createFilterEq(tx: Transaction, cat: 0 | 2 | 3 | 4 | 5, ids: number[]) {
  const rel = getPostTagsRel(cat);
  const selection = tx.select({ post_id: rel.post_id }).from(rel);
  if (ids.length == 1) return selection.where(eq(rel.tag_id, ids[0]));
  else
    return selection
      .where(inArray(rel.tag_id, ids))
      .groupBy(rel.post_id)
      .having(sql`count(${rel.tag_id}) = ${ids.length}`);
}

const deserializeTags = (tags: string[]) =>
  tags
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

const tagByName = db
  .select()
  .from($s.tagsTable)
  .where(eq($s.tagsTable.name, sql.placeholder('tag')))
  .prepare();

const countPosts = db
  .select({ count: sql<number>`COUNT(${$s.postTable.id})` })
  .from($s.postTable)
  .prepare();

const getPostTagsRel = <T extends 0 | 2 | 3 | 4 | 5>(category: T) =>
  ({
    0: $s.generalTags,
    2: $s.generalTags,
    3: $s.metaTags,
    4: $s.characterTags,
    5: $s.metaTags,
  })[category];

export let postsCount = countPosts.get()?.count || 0;
setInterval(() => (postsCount = countPosts.get()?.count || 0), 60000);

type Transaction = SQLiteTransaction<'sync', void, typeof $s, ExtractTablesWithRelations<typeof $s>>;
