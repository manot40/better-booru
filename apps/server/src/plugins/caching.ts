import cache from 'lib/cache';

import { Elysia } from 'elysia';

const TTL = 60 * 5;

export const caching = new Elysia({ name: 'caching' })
  .onBeforeHandle({ as: 'scoped' }, ({ request, headers, set }) => {
    const url = new URL(request.url);
    const key = url.pathname;

    if (headers['cache-control'] !== 'no-cache' && cache.has(key)) {
      const cached = cache.get<{ data: unknown; expires: number }>(key);
      if (cached.expires > Date.now()) {
        set.headers['expires'] = new Date(cached.expires).toUTCString();
        return cached.data;
      }
    }
  })
  .onAfterHandle({ as: 'scoped' }, ({ request, response, set }) => {
    if (set.headers['expires'] || +(set.status || 400) >= 300 || response instanceof Response) return;
    const url = new URL(request.url);
    cache.set(url.pathname, { data: response, expires: Date.now() + TTL * 1000 });
    set.headers['cache-control'] = `public, max-age=${TTL}, s-maxage=${TTL}`;
  });
