import { eq, getTableColumns, sql } from 'drizzle-orm';

import { db, schema as $s } from 'db';

export async function queryPostTags(post_id: number) {
  const post = db
    .$with('post')
    .as((qb) =>
      qb
        .select({ tag_ids: $s.postTable.tag_ids })
        .from($s.postTable)
        .where(eq($s.postTable.id, post_id))
        .limit(1)
    );

  const result = await db
    .with(post)
    .select(getTableColumns($s.tagsTable))
    .from($s.tagsTable)
    .innerJoin(post, eq($s.tagsTable.id, sql`ANY(${post.tag_ids})`));

  return result;
}
