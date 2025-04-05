import type { Setup } from 'index';

import { type InferHandler, t } from 'elysia';

import { $danbooruFetch, $gelbooruFetch } from 'utils/fetcher';

type Autocomplete = typeof autocompleteSchema.static;
type GelAutocomplete = Omit<Autocomplete, 'category' | 'post_count'> & {
  category: string;
  post_count: string;
};
const autocompleteSchema = t.Object({
  label: t.String(),
  value: t.String(),
  category: t.UnionEnum([0, 1, 2, 3, 4, 5]),
  post_count: t.Optional(t.Number()),
});

export const handler: Handler = async ({ query, userConfig, headers }) => {
  const { q, provider: qProvider } = query;
  const provider = qProvider || headers['x-provider'] || userConfig?.provider;

  if (provider === 'gelbooru') {
    const data = await $gelbooruFetch<GelAutocomplete[]>('/index.php', {
      query: { page: 'autocomplete2', term: q, type: 'tag_query', limit: '10' },
    });
    return data.map((d) => ({ ...d, category: booruCategory(d.category), post_count: +d.post_count }));
  } else {
    const data = await $danbooruFetch<Autocomplete[]>('/autocomplete.json', {
      query: { limit: '20', version: '1', 'search[type]': 'tag_query', 'search[query]': q },
    });
    return data;
  }
};

type Schema = { query: typeof query.static; response: typeof response.static };
type Handler = InferHandler<Setup, '/api/autocomplete', Schema>;

const query = t.Object({ q: t.String(), provider: t.Optional(t.UnionEnum(['danbooru', 'gelbooru'])) });
const response = t.Array(autocompleteSchema);
export const schema = { query, response };

function booruCategory(cat: string): Autocomplete['category'] {
  switch (cat) {
    case 'meta':
      return 5;
    case 'character':
      return 4;
    case 'copyright':
      return 3;
    case 'artist':
      return 1;
    default:
      return 0;
  }
}
