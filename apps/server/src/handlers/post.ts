import type { Setup } from 'index';
import type { DanbooruResponse, GelbooruResponse, Provider } from '@boorugator/shared/types';

import { type InferHandler, t } from 'elysia';

import { db } from 'db';
import { queryPosts } from 'lib/query/post';

import { tagSchema } from './post-tags';

import { processRating } from '@boorugator/shared';
import { processBooruData } from 'utils/common';
import { $danbooruFetch, $gelbooruFetch } from 'utils/fetcher';

export const handler: Handler = async ({ query, headers, store, userConfig }) => {
  const { tags, page, limit = '50' } = query;

  const baseRating = userConfig?.rating?.join(' ');
  const baseQuery = { s: 'post', q: 'index', pid: page, json: '1', page: 'dapi', limit };
  const provider = <Provider>(userConfig?.provider || 'danbooru');

  if (provider === 'gelbooru') {
    const query = { ...baseQuery, tags: processRating(provider, baseRating, tags) };
    const data = await $gelbooruFetch<GelbooruResponse>('/index.php', { query });
    return { meta: data['@attributes'], post: processBooruData(data.post || []) };
  } else {
    if (!db.enabled) {
      const query = { ...baseQuery, page, tags: processRating(provider, baseRating, tags) };
      const [data, { counts }] = await Promise.all([
        $danbooruFetch<DanbooruResponse[]>('/posts.json', { query }),
        $danbooruFetch<{ counts: { posts: number } }>('/counts/posts.json', { query: { tags: query.tags } }),
      ]);
      return { post: processBooruData(data), meta: { limit: +limit, count: counts.posts, offset: 0 } };
    }

    const rating_ = userConfig?.rating;
    const rating = rating_?.some((r) => !['g', 's', 'q', 'e'].includes(r)) ? undefined : rating_;
    const opts = { page: (page || 1).toString(), tags: <string[]>tags?.split(' '), limit: +limit, rating };

    return await queryPosts(opts);
  }
};

const post = t.Object({
  id: t.Number(),
  hash: t.String(),
  lqip: t.MaybeEmpty(t.String()),
  tags: t.Optional(t.Array(tagSchema)),
  score: t.Number(),
  rating: t.UnionEnum(['g', 's', 'q', 'e']),
  source: t.MaybeEmpty(t.String()),
  pixiv_id: t.MaybeEmpty(t.Number()),
  parent_id: t.MaybeEmpty(t.Number()),
  has_notes: t.Boolean(),
  created_at: t.String(),
  width: t.Number(),
  height: t.Number(),
  file_url: t.String(),
  file_ext: t.String(),
  file_size: t.Number(),
  sample_url: t.MaybeEmpty(t.String()),
  sample_width: t.MaybeEmpty(t.Number()),
  sample_height: t.MaybeEmpty(t.Number()),
  preview_url: t.String(),
  preview_width: t.Number(),
  preview_height: t.Number(),
});

const query = t.Object({
  page: t.Optional(t.Union([t.String(), t.Number()])),
  tags: t.Optional(t.String()),
  limit: t.Optional(t.Number()),
});

const response = t.Object({
  post: t.Array(post),
  meta: t.Object({
    limit: t.Number(),
    count: t.Number(),
    offset: t.Number(),
  }),
});

export type PostSchema = typeof post;

export const schema = { query, response: undefined as unknown as typeof response };

type Handler = InferHandler<Setup, '/api/post', typeof schema>;
