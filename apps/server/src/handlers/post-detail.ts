import type { Setup } from 'server';
import type { PostSchema } from './post';
import type { DanbooruResponse, GelbooruResponse, Provider } from '@boorugator/shared/types';

import { type InferHandler, type Static, t } from 'elysia';

import * as ASSET_URL from 'lib/query/helpers/file-url-builder';

import { db } from 'db';
import { queryPostTags } from 'lib/query/tags';

import { $danbooruFetch, $gelbooruFetch } from 'utils/fetcher';
import { processBooruData } from 'utils/common';
import { mapDanbooruData } from 'utils/danbooru';
import { populatePreviewCache } from 'lib/query/helpers/cache';

export const handler: Handler = async ({ params: { id }, userConfig, headers, status }) => {
  const provider = <Provider>(userConfig?.provider || 'danbooru');
  const baseQuery = { s: 'post', q: 'index', json: '1', page: 'dapi' };

  if (provider === 'gelbooru') {
    const query = { ...baseQuery, id };
    const data = await $gelbooruFetch<GelbooruResponse>('/index.php', { query });

    const [post] = processBooruData(data.post);
    if (!post) throw status(404, 'Post Not Found');

    return post;
  } else {
    if (!db.enabled) {
      const data = await $danbooruFetch<DanbooruResponse>(`/posts/${id}.json`);
      return mapDanbooruData(data);
    }

    const postData = await db.query.postTable.findFirst({
      columns: { tag_ids: false, meta_ids: false },
      extras: ASSET_URL,
      where: (post, { eq }) => eq(post.id, +id),
    });

    if (!postData) throw status(404, 'Post Not Found');

    const postTags = await queryPostTags(postData.id);

    const post = <Static<PostSchema>>{
      ...postData,
      tags: postTags,
      created_at: postData.created_at.toISOString(),
    };

    post.tags = postTags as NonNullable<(typeof post)['tags']>;
    populatePreviewCache(post);

    return post;
  }
};

const params = t.Object({ id: t.Number() });

export const schema = { params, response: undefined as unknown as PostSchema };

type Handler = InferHandler<Setup, '/api/post', typeof schema>;
