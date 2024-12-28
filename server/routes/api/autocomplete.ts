import type { Autocomplete } from '~~/types/common';

export default defineEventHandler(async (evt): Promise<Autocomplete[]> => {
  const userConfig = getUserConfig(evt);
  const provider = userConfig?.provider || getHeader(evt, 'x-provider');

  const { q } = <Record<string, string>>getQuery(evt);

  if (provider === 'safebooru') {
    const data = await $safebooruFetch<Autocomplete[] | string>('/autocomplete.php', { query: { q } });
    if (typeof data === 'string') return JSON.parse(data);
    return data;
  } else {
    return $gelbooruFetch<Autocomplete[]>('/index.php', {
      query: { page: 'autocomplete2', term: q, type: 'tag_query', limit: '10' },
    });
  }
});
