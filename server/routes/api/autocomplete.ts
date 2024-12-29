import type { Autocomplete, Provider } from '~~/types/common';

export default defineEventHandler(async (evt): Promise<Autocomplete[]> => {
  const headers = getHeaders(evt);
  const userConfig = getUserConfig(evt);
  const provider = <Provider>(headers['x-provider'] || userConfig?.provider || 'danbooru');

  const { q } = <Record<string, string>>getQuery(evt);

  if (provider === 'safebooru') {
    const data = await $safebooruFetch<Autocomplete[] | string>('/autocomplete.php', { query: { q } });
    if (typeof data === 'string') return JSON.parse(data);
    return data;
  } else if (provider === 'gelbooru') {
    return $gelbooruFetch<Autocomplete[]>('/index.php', {
      query: { page: 'autocomplete2', term: q, type: 'tag_query', limit: '10' },
    });
  } else {
    return $danbooruFetch<Autocomplete[]>('/autocomplete.json', {
      query: {
        limit: '20',
        version: '1',
        'search[type]': 'tag_query',
        'search[query]': q,
      },
    });
  }
});
