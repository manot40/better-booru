import { join } from 'node:path';
import { Elysia, file } from 'elysia';
import { cron, Patterns } from '@elysiajs/cron';

import { db } from 'db';

import sharp from 'sharp';
import { S3_ENABLED } from 'utils/s3';

import * as BooruUrl from 'lib/query/helpers/booru-url.builder';

import { run as lqipWorker } from './lqip-worker';
import { run as cleanupWorker } from './cleanup-worker';

import { getCache, setCache } from './cache';
import { Const, getHash, reduceSize } from './helpers';

export const images = new Elysia()
  .use(
    cron({
      run: lqipWorker,
      name: 'lqip_worker',
      pattern: Patterns.EVERY_30_MINUTES,
    })
  )
  .use(
    cron({
      run: cleanupWorker,
      name: 'ipx_cleanup_worker',
      pattern: Patterns.EVERY_WEEK,
    })
  )
  .get('/images/preview/:hash', async ({ set, params, status }) => {
    const path = join(process.cwd(), '.cache/ipx', params.hash);
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

      const [src, w, h] = reduced;
      const mods = { f: 'webp', w: w.toString(), h: h.toString() };

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

      const res = await fetch(src);

      if (!res.ok) {
        if (res.status === 404) return status(404, 'Image Not found');
        return status(500, `Failed to fetch image: ${res.status} ${res.statusText}`);
      }

      const quality = isNaN(+query.q) ? 80 : +query.q;
      const theSharp = sharp(await res.bytes())
        .resize({ width: w, height: h })
        .webp({ quality });

      const data = await theSharp.toBuffer();
      const metadata = await theSharp.metadata();

      const cache = setCache({
        data,
        id: hash,
        postId: post.id,
        loc: S3_ENABLED ? 'CDN' : 'LOCAL',
        type: 'PREVIEW',
        width: metadata.width,
        height: metadata.height,
        fileSize: data.byteLength,
        fileType: 'webp',
      });

      if (S3_ENABLED) {
        const url = await cache;
        if (url instanceof URL) return redirect(url.toString(), 301);
      }

      setHeaders(metadata.format, data.byteLength);

      return data;
    } catch (e) {
      throw status(500, e);
    }
  });
