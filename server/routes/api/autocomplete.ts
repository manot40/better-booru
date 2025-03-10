import type { Autocomplete, Provider } from '~~/types/common';

export default defineEventHandler(async (evt): Promise<Autocomplete[]> => {
  const headers = getHeaders(evt);
  const userConfig = getUserConfig(evt);
  const provider = <Provider>(headers['x-provider'] || userConfig?.provider || 'danbooru');

  const { q } = <Record<string, string>>getQuery(evt);

  if (provider === 'gelbooru') {
    return $gelbooruFetch<Autocomplete[]>('/index.php', {
      query: { page: 'autocomplete2', term: q, type: 'tag_query', limit: '10' },
    });
  } else {
    const fetcher = provider === 'safebooru' ? $safebooruFetch : $danbooruFetch;
    return fetcher<Autocomplete[]>('/autocomplete.json', {
      query: {
        limit: '20',
        version: '1',
        'search[type]': 'tag_query',
        'search[query]': q,
      },
    });
  }
});
