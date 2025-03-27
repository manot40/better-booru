import { db } from '~~/server/db';
import { queryPostTags } from '~~/server/lib/helpers';

export default defineEventHandler(async (evt) => {
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
