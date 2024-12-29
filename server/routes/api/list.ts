import type { DanbooruResponse } from '~~/types/danbooru';
import type { GelbooruResponse } from '~~/types/gelbooru';
import type { BooruData, PostList, Provider } from '~~/types/common';

import { withQuery } from 'ufo';

export default defineEventHandler(async (evt): Promise<PostList> => {
  const headers = getHeaders(evt);
  const userConfig = getUserConfig(evt);
  const routeQuery = <Record<string, string>>getQuery(evt);

  const { tags, page: pid, limit = '50', last_id } = routeQuery;
  const baseQuery = { s: 'post', q: 'index', pid, json: '1', page: 'dapi', last_id, limit };
  const provider = <Provider>(headers['x-provider'] || userConfig?.provider || 'danbooru');
  const rating = headers['x-rating'] || userConfig?.rating?.join('+');

  if (provider === 'safebooru') {
    const query = { ...baseQuery, tags };
    const data = await $safebooruFetch<BooruData[]>(withQuery('/index.php', query).replace('%2B', '+'));
    return { post: processBooruData(data) };
  } else if (provider === 'gelbooru') {
    const query = { ...baseQuery, tags: processRating(provider, rating, tags) };
    const url = withQuery('/index.php', query).replaceAll('%2B', '+');
    const data = await $gelbooruFetch<GelbooruResponse>(url);
    return { meta: data['@attributes'], post: processBooruData(data.post || []) };
  } else {
    const query = { ...baseQuery, page: pid, tags: processRating(provider, rating, tags) };
    const url = withQuery('/posts.json', query).replaceAll('%2B', '+');
    const data = await $danbooruFetch<DanbooruResponse[]>(url);
    return { post: processBooruData(data) };
  }
});
