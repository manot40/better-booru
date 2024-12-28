import type { GelbooruResponse } from '~~/types/gelbooru';
import type { BooruData, PostList } from '~~/types/common';

import { withQuery } from 'ufo';

export default defineEventHandler(async (evt): Promise<PostList> => {
  const userConfig = getUserConfig(evt);
  const provider = userConfig?.provider || getHeader(evt, 'x-provider');

  const {
    tags,
    page: pid,
    limit = '40',
    rating = userConfig?.rating,
    last_id,
  } = <Record<string, string>>getQuery(evt);
  const baseQuery = { s: 'post', q: 'index', pid, json: '1', page: 'dapi', last_id, limit };

  if (provider === 'safebooru') {
    const query = { ...baseQuery, tags };
    const data = await $safebooruFetch<BooruData[]>(withQuery('/index.php', query).replace('%2B', '+'));
    return { post: processBooruData(data) };
  } else {
    const query = { ...baseQuery, tags: processRating(rating, tags) };
    const url = withQuery('/index.php', query).replaceAll('%2B', '+');
    const data = await $gelbooruFetch<GelbooruResponse>(url);
    return { meta: data['@attributes'], post: processBooruData(data.post || []) };
  }
});
