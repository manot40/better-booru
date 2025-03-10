import type { DanbooruResponse } from '~~/types/danbooru';
import type { GelbooruResponse } from '~~/types/gelbooru';
import type { BooruData, PostList, Provider } from '~~/types/common';

export default defineEventHandler(async (evt): Promise<PostList> => {
  const headers = getHeaders(evt);
  const userConfig = getUserConfig(evt);
  const routeQuery = <Record<string, string>>getQuery(evt);

  const { tags, page: pid, limit = '50', last_id } = routeQuery;
  const baseQuery = { s: 'post', q: 'index', pid, json: '1', page: 'dapi', last_id, limit };
  const provider = <Provider>(headers['x-provider'] || userConfig?.provider || 'danbooru');
  const rating = headers['x-rating'] || userConfig?.rating?.join(' ');

  if (provider === 'gelbooru') {
    const query = { ...baseQuery, tags: processRating(provider, rating, tags) };
    const data = await $gelbooruFetch<GelbooruResponse>('/index.php', { query });
    return { meta: data['@attributes'], post: processBooruData(data.post || []) };
  } else {
    const fetcher = provider === 'safebooru' ? $safebooruFetch : $danbooruFetch;
    const query = { ...baseQuery, page: pid, tags: processRating(provider, rating, tags) };
    const [data, { counts }] = await Promise.all([
      fetcher<DanbooruResponse[]>('/posts.json', { query }),
      fetcher<{ counts: { posts: number } }>('/counts/posts.json', { query: { tags: query.tags } }),
    ]);

    return {
      post: processBooruData(data),
      meta: { limit: +limit, count: counts.posts, offset: 0 },
    };
  }
});
