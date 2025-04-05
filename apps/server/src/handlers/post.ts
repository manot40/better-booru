import type { Setup } from 'index';
import type { DanbooruResponse, GelbooruResponse, Provider } from '@boorugator/shared/types';

import { type InferHandler, t } from 'elysia';

import { db } from 'db';
import { queryPosts } from 'lib/query/post';

import { processRating } from '@boorugator/shared';
import { waitForWorker } from 'utils/wait-for-worker';
import { processBooruData } from 'utils/common';
import { $danbooruFetch, $gelbooruFetch } from 'utils/fetcher';

export const handler: Handler = async ({ query, headers, userConfig }) => {
  const { tags, page: pid, limit = '50' } = query;

  const baseRating = headers['x-rating'] || userConfig?.rating?.join(' ');
  const baseQuery = { s: 'post', q: 'index', pid, json: '1', page: 'dapi', limit };
  const provider = <Provider>(headers['x-provider'] || userConfig?.provider || 'danbooru');

  if (provider === 'gelbooru') {
    const query = { ...baseQuery, tags: processRating(provider, baseRating, tags) };
    const data = await $gelbooruFetch<GelbooruResponse>('/index.php', { query });
    return { meta: data['@attributes'], post: processBooruData(data.post || []) };
  } else {
    if (!db.enabled) {
      const query = { ...baseQuery, page: pid, tags: processRating(provider, baseRating, tags) };
      const [data, { counts }] = await Promise.all([
        $danbooruFetch<DanbooruResponse[]>('/posts.json', { query }),
        $danbooruFetch<{ counts: { posts: number } }>('/counts/posts.json', { query: { tags: query.tags } }),
      ]);
      return { post: processBooruData(data), meta: { limit: +limit, count: counts.posts, offset: 0 } };
    }

    const rating_ = headers['x-rating']?.split(' ') || userConfig?.rating;
    const rating = rating_?.some((r) => !['g', 's', 'q', 'e'].includes(r)) ? undefined : rating_;
    const opts = { page: <any>pid, tags: tags?.split(' '), limit: +limit, rating };

    const isExpensive = !!opts.tags && (opts.tags.length > 3 || opts.tags.some((t) => t.startsWith('-')));
    if (!isExpensive) return queryPosts(opts);

    const subfolder = import.meta.dir.includes('src') ? '/src' : '';
    return await waitForWorker(Bun.pathToFileURL(`${process.cwd()}${subfolder}/worker`), {
      type: 'QueryPosts',
      payload: opts,
    });
  }
};

const post = t.Object({
  id: t.Number(),
  hash: t.String(),
  tags: t.Optional(t.MaybeEmpty(t.String())),
  score: t.MaybeEmpty(t.Number()),
  rating: t.UnionEnum(['g', 's', 'q', 'e']),
  artist: t.MaybeEmpty(t.String()),
  source: t.MaybeEmpty(t.String()),
  pixiv_id: t.MaybeEmpty(t.Number()),
  parent_id: t.MaybeEmpty(t.Number()),
  has_notes: t.Boolean(),
  created_at: t.MaybeEmpty(t.Union([t.String(), t.Date()])),
  width: t.Number(),
  height: t.Number(),
  file_url: t.String(),
  file_ext: t.String(),
  sample_url: t.MaybeEmpty(t.String()),
  sample_width: t.MaybeEmpty(t.Number()),
  sample_height: t.MaybeEmpty(t.Number()),
  preview_url: t.MaybeEmpty(t.String()),
  preview_width: t.MaybeEmpty(t.Number()),
  preview_height: t.MaybeEmpty(t.Number()),
});

const query = t.Object({
  page: t.Union([t.String(), t.Number()]),
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

export const schema = { query, response };

type Handler = InferHandler<Setup, '/api/post', { query: typeof schema.query.static }>;
