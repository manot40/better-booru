import type { TagCategoryID } from '@boorugator/shared/types';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';

import { db, schema as $s } from 'db';

import { eq, sql } from 'drizzle-orm';

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
