import { join } from 'node:path';
import { Elysia, file } from 'elysia';
import { cron, Patterns } from '@elysiajs/cron';

import { db } from 'db';

import * as BooruUrl from 'lib/query/helpers/booru-url.builder';

import { run as imagesWorker } from './images-worker';
import { run as cleanupWorker } from './cleanup-worker';

import { getCache, setCache } from './cache';
import { Const, getHash, processImage, reduceSize } from './helpers';

export const images = new Elysia()
  .use(
    cron({
      run: imagesWorker,
      name: 'images_worker',
      pattern: Patterns.EVERY_30_MINUTES,
    })
  )
  .use(
    cron({
      run: cleanupWorker,
      name: 'images_cleanup_worker',
      pattern: Patterns.EVERY_WEEK,
    })
  )
  .get('/images/cleanup', async ({ headers, store, query, status }) => {
    const token = query.token || headers['authorization'];
    if (token !== process.env.DANBOORU_API_KEY) return status(401, 'Unauthorized');

    const cron = store.cron.images_cleanup_worker;
    if (cron.isBusy()) return 'Cleanup Already Running';

    cron.trigger();
    return 'Cleanup Started';
  })
  .get('/images/preview/:hash', async ({ set, params, status }) => {
    const path = join(Const.CACHE_DIR, params.hash);
    const isExists = await Bun.file(path).exists();

    if (isExists) {
      set.headers['content-type'] = 'image/webp';
      set.headers['cache-control'] = `public, max-age=${Const.MAX_AGE}`;
      return file(path);
    }

    return status(404);
  })
  .get('/images/:target', async ({ set, params, query, status, redirect }) => {
    try {
      const maxAge = Const.MAX_AGE;
      const target = params.target;
      const externUrl = Buffer.from(target, 'base64').toString('utf-8');

      if (externUrl.startsWith('http')) {
        const url = new URL(externUrl);

        if (!Const.ALLOWED_HOSTS.includes(url.hostname))
          return status(403, `Unallowed host for proxy: ${url.hostname}`);

        const res = await fetch(url);

        set.headers['content-type'] = res.headers.get('content-type') || 'application/octet-stream';
        set.headers['cache-control'] = `public, max-age=${maxAge}`;
        set.headers['content-length'] = res.headers.get('content-length') || undefined;

        /** @todo Maybe implement avif encoding for better original images compression */
        return res.arrayBuffer();
      }

      const isPostHash = target && [16, 32, 64].includes(target.length);

      if (!isPostHash) return status(501);

      const post = await db.query.postTable.findFirst({
        where: (t, { eq }) => eq(t.hash, target),
        columns: { tag_ids: false, meta_ids: false },
        extras: {
          file_url: BooruUrl.file_url.as('file_url'),
          sample_url: BooruUrl.sample_url.as('sample_url'),
          preview_url: BooruUrl.preview_url.as('preview_url'),
        },
      });
      if (!post) return status(404, 'Post not found');

      const reduced = reduceSize(post);
      if (!reduced) return status(400, 'Not an image');

      const [src, width, height] = reduced;
      const mods = { f: 'webp', w: width.toString(), h: height.toString() };

      const hash = getHash(src, mods);
      const cached = await getCache(hash);
      const setHeaders = (type: string, size: number) => {
        set.headers['content-type'] = `image/${type}`;
        set.headers['cache-control'] = `public, max-age=${maxAge}`;
        set.headers['content-length'] = size.toString();
        set.headers['content-security-policy'] = "default-src 'none'";
      };

      if (cached) {
        if (cached instanceof URL) return redirect(cached.toString(), 301);

        set.headers['x-cache-status'] = 'HIT';
        setHeaders(cached.meta.fileType, cached.meta.fileSize);

        return cached.data;
      }

      const result = await processImage({ src, width, height, quality: +query.q });

      if ('error' in result) return status(result.error, result.message);

      const { data, meta } = result;
      const cache = setCache(data, { id: hash, postId: post.id, ...meta });

      if (meta.loc === 'CDN') {
        const url = await cache;
        if (url instanceof URL) return redirect(url.toString(), 301);
      }

      setHeaders(meta.fileType, data.byteLength);

      return data;
    } catch (e) {
      throw status(500, e);
    }
  });
