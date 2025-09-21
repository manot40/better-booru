import type { Setup } from 'server';

import { type InferHandler, t } from 'elysia';

import { db } from 'db';
import { queryPostTags } from 'lib/query/tags';

export const handler: Handler = async ({ params: { id }, status }) => {
  const post = await db.query.postTable.findFirst({
    columns: { tag_ids: false, meta_ids: false },
    where: (post, { eq }) => eq(post.id, +id),
  });

  if (!post) throw status(404, 'Post Not Found');

  return await queryPostTags(post.id);
};

export const tagSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  category: t.UnionEnum([0, 1, 2, 3, 4, 5]),
});

const params = t.Object({ id: t.Number() });
const response = t.Array(tagSchema);
export const schema = { params, response };

type Handler = InferHandler<Setup, '/api/post', typeof schema>;
