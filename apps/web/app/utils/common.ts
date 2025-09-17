import type { AsyncDataRequestStatus } from '#app';

import { withQuery } from 'ufo';

export function getBaseURL() {
  const { baseUrl } = useRuntimeConfig().public;
  const fallback = import.meta.env.BASE_URL || 'http://localhost:3001';

  if (baseUrl) return baseUrl;
  else return typeof location != 'undefined' ? location.origin : fallback;
}

export const randomInt = (from: number, to: number) => Math.floor(Math.random() * (to - from + 1) + from);

export const isPend = (status: AsyncDataRequestStatus) => status === 'pending';

export const unwrapRef = <T = any>(v: MaybeRef<T>) => (isRef(v) ? v.value : v);

export const createBooruURL = (id: number) => {
  const config = useUserConfig();
  if (config.provider === 'gelbooru') return `https://gelbooru.com/index.php?page=post&s=view&id=${id}`;
  return `https://${config.provider}.donmai.us/posts/${id}`;
};

export const getWeservURL = (src: string, opts = {}) =>
  withQuery('https://wsrv.nl', { url: src.replace(/http(s?):\/\//, ''), ...opts });
