import type { BooruData } from '~~/types/booru';

import { withQuery } from 'ufo';

export default defineEventHandler((evt) => {
  const { page: pid, last_id, tags } = <Record<string, string>>getQuery(evt);
  const query = { s: 'post', q: 'index', pid, json: '1', page: 'dapi', last_id, tags };
  return $booruFetch<BooruData>(withQuery('/index.php', query).replace('%2B', '+'));
});
