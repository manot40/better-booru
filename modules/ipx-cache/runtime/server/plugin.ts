import type { ServerResponse } from 'http';

import { cacheStore } from './cache';

import { PassThrough } from 'node:stream';
import { CaptureStream } from '../utils/capture-stream';

import { defineNitroPlugin } from 'nitropack/runtime';
import { sendStream, setHeaders, getHeader } from 'h3';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', async function (evt) {
    if (!evt.path.startsWith('/_ipx/')) return;

    const reqUrl = (evt.path || '').replace(/\/_ipx\/|,|http(s?):\/\//g, '').replace('&', '-');
    const originalRes = evt.node.res;

    if (!getHeader(evt, 'cache-control')?.includes('ipx-purge')) {
      /** Load from cache if there is any */
      const cached = await cacheStore.get(reqUrl);
      if (cached) {
        setHeaders(evt, { ...(<{}>cached.meta), 'cache-status': 'HIT' });
        originalRes.setHeader = (_key, _val) => originalRes;
        return sendStream(evt, cached.data.stream());
      }
    }

    const passThrough = new PassThrough();
    const captureStream = new CaptureStream();
    passThrough.pipe(captureStream);

    const originalWrite = originalRes.write.bind(originalRes) as CustomStream<boolean>;
    const originalEnd = originalRes.end.bind(originalRes) as CustomStream<ServerResponse>;

    originalRes.write = <CustomStream<boolean>>((chunk, encoding, callback) => {
      passThrough.write(chunk, <BufferEncoding>encoding, callback);
      return originalWrite(chunk, <BufferEncoding>encoding, callback);
    });
    originalRes.end = <CustomStream<ServerResponse>>((chunk, encoding, callback) => {
      if (chunk) passThrough.write(chunk, encoding as BufferEncoding, callback);
      setHeaders(evt, { 'cache-status': 'MISS' });
      originalEnd(chunk, encoding, callback);

      if (originalRes.statusCode !== 200) return originalRes;

      const data = captureStream.getBuffer();
      const meta = { ...originalRes.getHeaders(), 'content-length': data.byteLength };
      cacheStore.set(reqUrl, { data, meta });

      return originalRes;
    });
  });
});

type CustomStream<T> = (
  chunk: any,
  encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
  callback?: (error: Error | null | undefined) => void
) => T;
