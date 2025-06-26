import { eq } from 'drizzle-orm';

import { db, schema as $s } from 'db';

export function queryExpensiveTags(type: 'common' | 'uncommon' | 'meta') {
  const table =
    type == 'meta'
      ? $s.expensiveMetaTags
      : type == 'uncommon'
        ? $s.expensiveUncommonTags
        : $s.expensiveCommonTags;
  return db.select().from(table).all();
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
