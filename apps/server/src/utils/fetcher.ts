import { createFetch, type FetchContext } from 'ofetch';

const config = {
  danbooruUserId: Bun.env.DANBOORU_USER_ID || '',
  danbooruApiKey: Bun.env.DANBOORU_API_KEY || '',
  gelbooruUserId: Bun.env.GELBOORU_USER_ID || '',
  gelbooruApiKey: Bun.env.GELBOORU_API_KEY || '',
};

export const $gelbooruFetch = createFetch({
  defaults: {
    baseURL: 'https://gelbooru.com',
    onRequest({ options }) {
      const query = { user_id: config.gelbooruUserId, api_key: config.gelbooruApiKey };
      Object.assign((options.query ??= {}), query);
    },
  },
});

function onDonmaiReq({ options }: FetchContext) {
  const query = { login: config.danbooruUserId, api_key: config.danbooruApiKey };
  Object.assign((options.query ??= {}), query);
}
export const $danbooruFetch = createFetch({
  defaults: { baseURL: 'https://danbooru.donmai.us', onRequest: onDonmaiReq },
});
export const $safebooruFetch = createFetch({
  defaults: { baseURL: 'https://safebooru.donmai.us', onRequest: onDonmaiReq },
});
