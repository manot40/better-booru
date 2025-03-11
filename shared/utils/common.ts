import type { Provider } from '~~/types/common';

import { parseURL, stringifyParsedURL } from 'ufo';

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
