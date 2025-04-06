import cache from 'lib/cache';

import { Elysia } from 'elysia';

const TTL = 60 * 5;
const VARIES = ['x-rating', 'x-provider'];

type Options = {
  varies?: string[];
  cacheTTL?: number;
  pathRegex?: RegExp[];
};

export const caching = (options?: Options) => {
  const { pathRegex, varies = VARIES, cacheTTL = TTL } = options || {};
  return new Elysia({ name: 'caching', seed: options })
    .state('cacheTTL', cacheTTL)
    .onBeforeHandle(({ request, headers, set }) => {
      const url = new URL(request.url);
      if (pathRegex && !pathRegex.some((r) => r.test(url.pathname))) return;

      const key = generateKey(url, headers, varies);
      set.headers['vary'] = varies.join(', ');

      if (headers['cache-control'] !== 'no-cache' && cache.has(key)) {
        const cached = cache.get<{ data: unknown; expires: number }>(key);
        if (cached.expires > Date.now()) {
          set.headers['expires'] = new Date(cached.expires).toUTCString();
          return cached.data;
        }
      }
    })
    .onAfterHandle(({ headers, request, response, set, store }) => {
      const url = new URL(request.url);
      if (pathRegex && !pathRegex.some((r) => r.test(url.pathname))) return;
      if (set.headers['expires'] || +(set.status || 400) >= 300 || response instanceof Response) return;

      const key = generateKey(url, headers, varies);
      cache.set(key, { data: response, expires: Date.now() + store.cacheTTL * 1000 });
      set.headers['cache-control'] = `public, max-age=${TTL}, s-maxage=${TTL}`;
    })
    .as('plugin');
};

const separate = (str: MaybeArray<string | undefined>): string =>
  Array.isArray(str) ? separate(str.filter(Boolean).join(',')) : str ? `:${str}` : '';
const generateKey = (url: URL, headers: Record<string, string | undefined>, varies: string[]) =>
  `${url.pathname}${separate(url.search.slice(1))}${separate(varies.map((v) => headers[v]?.trim()))}`;
