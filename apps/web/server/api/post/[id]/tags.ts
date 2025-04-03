import { db, schema as $s } from '~~/server/db';

import { eq } from 'drizzle-orm';

export default defineEventHandler((evt) => {
  if (!db) return [];

  const id = getRouterParam(evt, 'id');
  if (!id || Number.isNaN(+id))
    return sendError(evt, createError({ statusCode: 400, statusMessage: 'Invalid Post ID' }));

  const post = db.query.postTable.findFirst({ where: (post, { eq }) => eq(post.id, +id) }).sync();
  if (!post) return sendError(evt, createError({ statusCode: 404, statusMessage: 'Post Not Found' }));

  const tags = queryPostTags(post.id);
  const artist = db.query.tagsTable
    .findFirst({ where: (table, { eq }) => eq(table.id, post.artist_id) })
    .sync()!;

  return [artist, ...tags];
});

function queryPostTags(post_id: number) {
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
