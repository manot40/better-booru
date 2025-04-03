import type { TagCategoryID } from 'booru-shared/types';
import type { PostRelations } from '~~/server/db/schema';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';

import { db, schema as $s } from '~~/server/db';

import { eq, sql, inArray } from 'drizzle-orm';

export function createFilterEq(cat: 0 | 2 | 3 | 4 | 5, ids: number[], tx = db as typeof db | Transaction) {
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
