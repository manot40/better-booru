import cache from 'lib/cache';

import { Elysia } from 'elysia';

const TTL = 60 * 5;
const VARIES = ['x-rating', 'x-provider'];

export const caching = new Elysia({ name: 'caching' })
  .onBeforeHandle({ as: 'scoped' }, ({ request, headers, set }) => {
    const key = generateKey(new URL(request.url), headers);
    set.headers['vary'] = VARIES.join(', ');

    if (headers['cache-control'] !== 'no-cache' && cache.has(key)) {
      const cached = cache.get<{ data: unknown; expires: number }>(key);
      if (cached.expires > Date.now()) {
        set.headers['expires'] = new Date(cached.expires).toUTCString();
        return cached.data;
      }
    }
  })
  .onAfterHandle({ as: 'scoped' }, ({ headers, request, response, set }) => {
    if (set.headers['expires'] || +(set.status || 400) >= 300 || response instanceof Response) return;
    const key = generateKey(new URL(request.url), headers);
    cache.set(key, { data: response, expires: Date.now() + TTL * 1000 });
    set.headers['cache-control'] = `public, max-age=${TTL}, s-maxage=${TTL}`;
  });

const separate = (str: MaybeArray<string | undefined>): string =>
  str ? (Array.isArray(str) ? separate(str.filter(Boolean).join(',')) : `:${str}`) : '';
const generateKey = (url: URL, headers: Record<string, string | undefined>) =>
  `${url.pathname}${separate(url.search.slice(1))}${separate(VARIES.map((v) => headers[v]?.trim()))}`;
