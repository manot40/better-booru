import type { Transaction } from 'db';

export type TagsFilter = {
  eq?: number[];
  ne?: number[];
};
export type DeserializedTags = {
  tags?: TagsFilter;
  authors?: TagsFilter;
  hasInequality: boolean;
};

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

      const key = tag.category === 1 ? 'authors' : 'tags';
      const target = (t[key] ??= {});

      if (exc) {
        target.ne ||= [];
        target.ne.push(tag.id);
        t.hasInequality ||= true;
      } else {
        target.eq ||= [];
        target.eq.push(tag.id);
      }

      return t;
    },
    <DeserializedTags>{ hasInequality: false }
  );
}
