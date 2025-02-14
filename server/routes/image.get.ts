import type { IncomingHttpHeaders } from 'node:http';

const MAX_AGE = 60 * 60 * 24;
const cacheStore = createIPXCache(process.cwd() + '/.cache/ipx/original', MAX_AGE);

export default defineEventHandler(async (evt) => {
  const { proxy } = getQuery(evt);
  if (typeof proxy != 'string') return createError({ statusCode: 404 });
  if (!proxy.includes('booru')) return createError({ statusCode: 400 });

  const url = new URL(proxy);
  const cacheKey = `/${url.hostname}/${url.pathname.split('/').pop()}`;

  const cached = await cacheStore.get(cacheKey);
  if (cached) {
    Object.entries(cached.meta).forEach(([key, value]) => setResponseHeader(evt, key, value));
    setResponseHeader(evt, 'cache-status', 'HIT');
    return cached.data;
  }

  const res = await fetch(proxy);
  const cacheControl = `public, max-age=${MAX_AGE}, no-transform`;
  const contentType = res.headers.get('content-type') || 'application/octet-stream';

  if (!res.ok || !res.body)
    return createError({ data: await res.text(), statusCode: res.status, statusMessage: res.statusText });
  else if (!contentType.startsWith('image'))
    return createError({ statusCode: 406, message: 'Received content is not an image' });

  const [toSend, toSave] = res.body.tee();
  new Promise<void>((resolve) => {
    const reader = toSave.getReader();
    const chunks = <Uint8Array<ArrayBufferLike>[]>[];
    reader.read().then(handleChunks);
    function handleChunks({ value, done }: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) {
      if (done) {
        const data = Buffer.concat(chunks);
        const meta = {
          expires: new Date().toUTCString(),
          'cache-control': cacheControl,
          'content-type': res.headers.get('content-type') || 'application/octet-stream',
          'content-length': data.byteLength.toString(),
        } satisfies IncomingHttpHeaders;
        cacheStore.set(cacheKey, { data, meta }).then(resolve);
      } else {
        chunks.push(value);
        reader.read().then(handleChunks);
      }
    }
  });

  setResponseHeader(evt, 'cache-status', 'MISS');
  setResponseHeader(evt, 'content-type', contentType);
  setResponseHeader(evt, 'cache-control', cacheControl);
  return sendStream(evt, toSend);
});
