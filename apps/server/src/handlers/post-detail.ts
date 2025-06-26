import type { Setup } from 'index';
import type { PostSchema } from './post';
import type { DanbooruResponse, GelbooruResponse, Provider } from '@boorugator/shared/types';

import { type InferHandler, type Static, t } from 'elysia';

import * as ASSET_URL from 'lib/query/helpers/file-url-builder';

import { db } from 'db';
import { queryPostTags } from 'lib/query/tags';

import { $danbooruFetch, $gelbooruFetch } from 'utils/fetcher';
import { processBooruData } from 'utils/common';
import { mapDanbooruData } from 'utils/danbooru';

export const handler: Handler = async ({ params: { id }, userConfig, headers, status }) => {
  const provider = <Provider>(headers['x-provider'] || userConfig?.provider || 'danbooru');
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

    const query = db.query.postTable.findFirst({
      extras: {
        file_url: ASSET_URL.file_url.as('file_url'),
        sample_url: ASSET_URL.sample_url.as('sample_url'),
        preview_url: ASSET_URL.preview_url.as('preview_url'),
      },
      where: (post, { eq }) => eq(post.id, +id),
    });

    const postData = query.sync();
    if (!postData) throw status(404, 'Post Not Found');

    const qTags = queryPostTags(postData.id);
    const artist = db.query.tagsTable
      .findFirst({ where: (table, { eq }) => eq(table.id, postData.artist_id) })
      .sync()!;

    const tags = [artist, ...qTags].map((v) => v.name).join(' ');
    const post = <Static<PostSchema>>{
      ...postData,
      artist: artist.name,
      created_at: postData.created_at.toString(),
    };

    post.tags = tags;

    return post;
  }
};

const params = t.Object({ id: t.Number() });

export const schema = { params, response: undefined as unknown as PostSchema };

type Handler = InferHandler<Setup, '/api/post', typeof schema>;
