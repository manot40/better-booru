import type { Setup } from 'index';

import { eq } from 'drizzle-orm';
import { db, schema as $s } from 'db';

import { type InferHandler, t } from 'elysia';

export const handler: Handler = async ({ params: { id }, error }) => {
  const post = db.query.postTable.findFirst({ where: (post, { eq }) => eq(post.id, +id) }).sync();
  if (!post) throw error(404, 'Post Not Found');

  const tags = queryPostTags(post.id);
  const artist = db.query.tagsTable
    .findFirst({ where: (table, { eq }) => eq(table.id, post.artist_id) })
    .sync()!;

  return [artist, ...tags];
};

const params = t.Object({ id: t.Number() });

const response = t.Array(
  t.Object({ id: t.Number(), name: t.String(), category: t.UnionEnum([0, 1, 2, 3, 4, 5]) })
);

export const schema = { params, response };

type Handler = InferHandler<Setup, '/api/post', { params: typeof schema.params.static }>;

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
