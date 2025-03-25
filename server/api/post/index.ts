import type { GelbooruResponse } from '~~/types/gelbooru';
import type { PostList, Provider } from '~~/types/common';

import { queryPosts } from '~~/server/lib/query';

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
    return queryPosts({ limit: +limit, page: <any>pid, tags: tags?.split(' ') });
  }
});
