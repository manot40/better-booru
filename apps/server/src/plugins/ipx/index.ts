import { Elysia } from 'elysia';
import { cron, Patterns } from '@elysiajs/cron';

import { S3_ENABLED } from 'utils/s3';
import { createIPX, ipxFSStorage, ipxHttpStorage } from 'ipx';

import { run as lqipWorker } from './lqip-worker';
import { run as cleanupWorker } from './cleanup-worker';

import { getCache, setCache } from './cache';
import { Const, getModifiers, type HeaderMeta } from './helpers';

const ipx = createIPX({
  maxAge: Const.MAX_AGE,
  storage: ipxFSStorage({ dir: './public/cache' }),
  httpStorage: ipxHttpStorage({ domains: Const.ALLOWED_HOSTS }),
});

export const ipxCache = new Elysia()
  .use(
    cron({
      run: lqipWorker,
      name: 'lqip_worker',
      pattern: Patterns.EVERY_MINUTE,
    })
  )
  .use(
    cron({
      run: cleanupWorker,
      name: 'ipx_cleanup_worker',
      pattern: Patterns.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT,
    })
  )
  .get('/image/*', async ({ set, params, status, redirect }) => {
    try {
      const maxAge = Const.MAX_AGE;
      const rawParam = params['*'];
      const [modString = '', ...ids] = rawParam.split('/');

      if (!modString) {
        throw new Error('IPX Modifier Not Provided');
      } else if (modString === '_') {
        const url = new URL(rawParam.replace(/.*_\//i, ''));

        if (!Const.ALLOWED_HOSTS.includes(url.hostname)) {
          throw new Error(`Unallowed host for proxy: ${url.hostname}`);
        }

        const res = await fetch(url);
        set.headers['content-type'] = res.headers.get('content-type') || 'application/octet-stream';
        set.headers['cache-control'] = `public, max-age=${maxAge}`;
        set.headers['content-length'] = res.headers.get('content-length') || undefined;

        return res.arrayBuffer();
      }

      const { id, hash, modifiers } = getModifiers(ids, modString);

      const cached = await getCache(hash);

      if (cached) {
        if (cached instanceof URL) return redirect(cached.toString(), 301);

        set.headers['x-cache-status'] = 'HIT';
        Object.assign(set.headers, cached.meta);

        return cached.data;
      }

      const prepare = ipx(id, modifiers);
      const { data, format } = await prepare.process();

      const now = new Date();
      const meta = <HeaderMeta>{
        expires: new Date(now.getTime() + maxAge * 1000).toUTCString(),
        'content-type': format ? `image/${format}` : undefined,
        'cache-control': `max-age=${maxAge}, public, s-maxage=${maxAge}`,
        'last-modified': now.toUTCString(),
        'content-length': data.length,
      };

      Object.assign(set.headers, {
        ...meta,
        ['content-security-policy']: "default-src 'none'",
      });

      const cache = setCache(hash, { data, meta, maxAge });

      if (S3_ENABLED) {
        const url = await cache;
        if (url instanceof URL) return redirect(url.toString(), 301);
      }

      return data;
    } catch (e) {
      throw status(500, e);
    }
  });
