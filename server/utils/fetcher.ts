import { createFetch } from 'ofetch';

export const $safebooruFetch = createFetch({ defaults: { baseURL: 'https://safebooru.org' } });

export const $gelbooruFetch = createFetch({
  defaults: {
    baseURL: 'https://gelbooru.com',
    onRequest({ options }) {
      const config = useRuntimeConfig();
      const query = { user_id: config.gelbooruUserId, api_key: config.gelbooruApiKey };
      Object.assign((options.query ??= {}), query);
    },
  },
});

export const $danbooruFetch = createFetch({
  defaults: {
    baseURL: 'https://danbooru.donmai.us',
    onRequest({ options }) {
      const config = useRuntimeConfig();
      const query = { login: config.danbooruUserId, api_key: config.danbooruApiKey };
      Object.assign((options.query ??= {}), query);
    },
  },
});
