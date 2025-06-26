import type { Setup } from 'index';

import { type InferHandler, t } from 'elysia';

import { db } from 'db';
import { queryPostTags } from 'lib/query/tags';

export const handler: Handler = async ({ params: { id }, status }) => {
  const post = db.query.postTable.findFirst({ where: (post, { eq }) => eq(post.id, +id) }).sync();
  if (!post) throw status(404, 'Post Not Found');

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

type Handler = InferHandler<Setup, '/api/post', typeof schema>;
