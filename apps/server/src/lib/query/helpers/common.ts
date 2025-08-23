import { schema as $s, type Transaction } from 'db';

import { inArray } from 'drizzle-orm';

export type DeserializedTags = Record<'eq' | 'ne', number[] | undefined>;

export async function deserializeTags(tx: Transaction, tags: string[]): Promise<DeserializedTags> {
  const normalized = tags.map((t) => {
    const exc = /^-/.test(t);
    const tagName = exc ? t.slice(1) : t;
    return { exc, tagName };
  });

  const result = await tx
    .select()
    .from($s.tagsTable)
    .where(
      inArray(
        $s.tagsTable.name,
        normalized.map((t) => t.tagName)
      )
    )
    .then((res) => res.map((tag, i) => ({ tag, exc: normalized[i].exc })));

  return result.reduce(
    (t, { exc, tag }) => {
      if (!tag) return t;

      if (exc) {
        t.ne ||= [];
        t.ne.push(tag.id);
      } else {
        t.eq ||= [];
        t.eq.push(tag.id);
      }

      return t;
    },
    <DeserializedTags>{}
  );
}
