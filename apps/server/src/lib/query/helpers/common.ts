import type { Transaction } from 'db';

export type DeserializedTags = Record<'eq' | 'ne', number[] | undefined>;

export async function deserializeTags(tx: Transaction, tags: string[]): Promise<DeserializedTags> {
  const normalized = tags
    .map((t) => {
      const exc = /^-/.test(t);
      const tagName = exc ? t.slice(1) : t;
      return { exc, tagName };
    })
    .sort((a, b) => a.tagName.localeCompare(b.tagName));

  const result = await tx.query.tagsTable
    .findMany({
      where: (table, { inArray }) =>
        inArray(
          table.name,
          normalized.map((t) => t.tagName)
        ),
      orderBy: (table, { asc }) => asc(table.name),
    })
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
