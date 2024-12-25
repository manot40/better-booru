import type { BooruAutocomplete } from '~~/types/booru';

export default defineEventHandler(async (evt) => {
  const { q } = <Record<string, string>>getQuery(evt);
  const data = await $booruFetch<BooruAutocomplete[] | string>('/autocomplete.php', { query: { q } });

  if (typeof data === 'string') return JSON.parse(data) as BooruAutocomplete[];
  return data;
});
