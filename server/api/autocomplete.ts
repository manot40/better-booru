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
    const data = await fetcher<Autocomplete[]>('/autocomplete.json', {
      query: {
        limit: '20',
        version: '1',
        'search[type]': 'tag_query',
        'search[query]': q,
      },
    });

    return data.map((tag) => ({ ...tag, category: booruCategory(tag.category as unknown as number) }));
  }
});

function booruCategory(cat: number): Autocomplete['category'] {
  switch (cat) {
    case 5:
      return 'meta';
    case 4:
      return 'character';
    case 3:
      return 'copyright';
    case 1:
      return 'artist';
    default:
      return 'tag';
  }
}
