import { createFetch, type FetchContext } from 'ofetch';

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

function onDonmaiReq({ options }: FetchContext) {
  const config = useRuntimeConfig();
  const query = { login: config.danbooruUserId, api_key: config.danbooruApiKey };
  Object.assign((options.query ??= {}), query);
}
export const $danbooruFetch = createFetch({
  defaults: { baseURL: 'https://danbooru.donmai.us', onRequest: onDonmaiReq },
});
export const $safebooruFetch = createFetch({
  defaults: { baseURL: 'https://safebooru.donmai.us', onRequest: onDonmaiReq },
});
