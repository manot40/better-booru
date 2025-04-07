import type { TagCategoryID } from '@boorugator/shared/types';
import type { PostRelations } from 'db/schema';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type { ExtractTablesWithRelations, SQL } from 'drizzle-orm';

import { db, schema as $s } from 'db';

import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';

type FilterOptions = {
  tx?: typeof db | Transaction;
  cat: 0 | 2 | 3 | 4 | 5;
  ids: number[];
  range?: [number, number];
};

export function createFilterEq(opts: FilterOptions) {
  const { cat, ids, range, tx: qb = db } = opts;

  if (cat === 0 || cat === 2) {
    const q = <ReturnType<typeof createRelationQuery>[]>[];
    const common = ids.filter((id) => id <= 800);
    const uncommon = ids.filter((id) => id > 800);
    if (common.length > 0) q.push(createRelationQuery($s.commonTags, common));
    if (uncommon.length > 0) q.push(createRelationQuery($s.uncommonTags, uncommon));
    return q;
  } else return [createRelationQuery(getPostTagsRel(cat), ids)];

  function getRangeFilter<R extends PostRelations>(rel: R): [SQL, SQL] | [] {
    if (!range) return [];
    const [upper, lower] = range;
    return [lte(rel.post_id, upper), gte(rel.post_id, lower)];
  }
  function createRelationQuery<R extends PostRelations>(rel: R, ids: number[]) {
    const range = getRangeFilter(rel);
    const selection = qb.select({ post_id: rel.post_id }).from(rel);
    if (ids.length == 1) return selection.where(and(...range, eq(rel.tag_id, ids[0])));
    return selection
      .where(and(...range, inArray(rel.tag_id, ids)))
      .groupBy(rel.post_id)
      .having(sql`count(${rel.tag_id}) = ${ids.length}`);
  }
}

export function deserializeTags(tags: string[]) {
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

export const getPostTagsRel = <T extends 3 | 4 | 5>(category: T) =>
  ({ 3: $s.metaTags, 4: $s.characterTags, 5: $s.metaTags })[category];

export type Transaction = SQLiteTransaction<'sync', void, typeof $s, ExtractTablesWithRelations<typeof $s>>;
