import { createFetch } from 'ofetch';

export const $booruFetch = createFetch({ defaults: { baseURL: 'https://safebooru.org' } });
