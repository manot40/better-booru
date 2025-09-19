import type { MaybeArray } from 'types/util';

import MemoryCache from 'lib/cache/memory';

import { Elysia } from 'elysia';
import { STATIC } from '@boorugator/shared';

const TTL = 60 * 5;
const VARIES = [`x-${STATIC.keys.userConfig}`];

type Options = {
  varies?: string[];
  cacheTTL?: number;
  pathRegex?: RegExp[];
};

type ResponseCache = {
  data: unknown;
  expires: number;
};

export const caching = (options?: Options) => {
  const cache = new MemoryCache<ResponseCache>();
  const { pathRegex, varies = VARIES, cacheTTL = TTL } = options || {};

  return new Elysia({ name: 'caching', seed: options })
    .state('cacheTTL', undefined as number | undefined)
    .derive({ as: 'local' }, () => ({ resolveTime: performance.now() }))
    .onBeforeHandle(({ request, headers, set }) => {
      const url = new URL(request.url);
      if (pathRegex && !pathRegex.some((r) => r.test(url.pathname))) return;

      const key = generateKey(url, headers, varies);
      set.headers['vary'] = varies.join(', ');

      if (headers['cache-control'] !== 'no-cache' && cache.has(key)) {
        const cached = cache.get(key);
        if (cached.expires > Date.now()) {
          set.headers['expires'] = new Date(cached.expires).toUTCString();
          return cached.data;
        }
      }
    })
    .onAfterHandle(({ headers, request, response, set, store, resolveTime }) => {
      const expensive = performance.now() - resolveTime > 3000;

      const url = new URL(request.url);
      const key = generateKey(url, headers, varies);
      const ttl = store.cacheTTL ?? (expensive ? Math.max(60 * 60, cacheTTL) : cacheTTL);

      /** Match cache path */
      if (pathRegex && !pathRegex.some((r) => r.test(url.pathname))) return;
      /** Override when response non 200 status or when custom response returned */
      if (set.headers['expires'] || +(set.status || 400) >= 300 || response instanceof Response) return;

      cache.set(key, { data: response, expires: Date.now() + ttl * 1000 });
      set.headers['cache-control'] = `public, max-age=${ttl}, s-maxage=${ttl}`;
    })
    .as('scoped');
};

const separate = (str: MaybeArray<string | undefined>): string =>
  Array.isArray(str) ? separate(str.filter(Boolean).join(',')) : str ? `:${str}` : '';
const generateKey = (url: URL, headers: Record<string, string | undefined>, varies: string[]) =>
  `${url.pathname}${separate(url.search.slice(1))}${separate(varies.map((v) => headers[v]?.trim()))}`;
