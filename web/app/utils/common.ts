import type { Provider, UserConfig } from '~/types';
import type { AsyncDataRequestStatus } from '#app';

import { parseURL, stringifyParsedURL, withQuery } from 'ufo';

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
  withQuery('https://wsrv.nl', {
    url: src.replace(/http(s?):\/\//, ''),
    ...opts,
  });

export const processRating = (provider: Provider, rating: string | undefined, tags = '') => {
  if (!rating || rating === 'all') return tags;
  const tagAppend = tags ? tags + ' ' : '';

  if (provider === 'danbooru') {
    const processed = 'rating:' + rating.replaceAll(' ', ',');
    return `${tagAppend}${processed}`;
  } else {
    const splitted = rating.split(' ');
    const processed = splitted.reduce((acc, next, i) => {
      const plus = i === 0 ? '' : ' ';
      if (!next) return acc;
      if (!next.startsWith('-')) return acc + `${plus}rating:${next}`;
      return acc + `${plus}-rating:${next.slice(1)}`;
    }, '');

    return processed ? `${tagAppend}${processed}` : tags;
  }
};

export async function stringDigest(text: string, algo = 'SHA-1') {
  const encoded = new TextEncoder().encode(text);
  const data = new Uint8Array(await crypto.subtle.digest(algo, encoded));
  return Array.from(data, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function imgAlias(url_: string, provider: Provider) {
  if (!url_) return url_;
  const url = parseURL(url_);
  url.host = undefined;
  url.protocol = undefined;
  url.pathname = `/${provider}` + url.pathname;
  return stringifyParsedURL(url);
}

export function imageAspectRatio(width: number, height: number): [number, number] {
  if (width <= 0 || height <= 0) throw new Error('Width and height must be positive numbers');
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return [width / divisor, height / divisor];
}

export const unshortenUrl = (url: string) =>
  url.startsWith('/danbooru') ? url.replace('/danbooru', 'https://cdn.donmai.us') : url;

// @ts-ignore
export function isUserConfig<T = any>(payload: T): payload is UserConfig {
  return payload && typeof payload == 'object' && 'provider' in payload && 'rating' in payload;
}
