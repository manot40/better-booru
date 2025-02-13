export default defineEventHandler(async (evt) => {
  const { proxy } = getQuery(evt);
  if (typeof proxy != 'string') return createError({ statusCode: 404 });
  if (!proxy.includes('booru')) return createError({ statusCode: 400 });

  const url = new URL(proxy);
  const cacheKey = `/original/${url.hostname}/${url.pathname.split('/').pop()}`;

  const cached = await cacheStore.get(cacheKey);
  if (cached) {
    Object.entries(cached.meta).forEach(([key, value]) => setResponseHeader(evt, key, value));
    setResponseHeader(evt, 'cache-status', 'HIT');
    return cached.data;
  }

  const res = await fetch(proxy);
  if (!res.ok || !res.body)
    return createError({
      data: await res.text(),
      statusCode: res.status,
      statusText: res.statusText,
    });

  setResponseHeader(evt, 'content-type', res.headers.get('content-type') || 'application/octet-stream');
  setResponseHeader(evt, 'Cache-Control', 'public, max-age=31536000');

  const [toSend, toSave] = res.body.tee();

  new Promise<void>((resolve) => {
    const reader = toSave.getReader();
    const chunks = <Uint8Array<ArrayBufferLike>[]>[];
    reader.read().then(handleChunks);
    function handleChunks({ value, done }: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) {
      if (done) {
        const data = Buffer.concat(chunks);
        const meta = { 'content-length': data.byteLength, 'last-modified': new Date().toUTCString() };
        cacheStore.set(cacheKey, { data, meta }).then(resolve);
      } else {
        chunks.push(value);
        reader.read().then(handleChunks);
      }
    }
  });

  setResponseHeader(evt, 'cache-status', 'MISS');
  return sendStream(evt, toSend);
});
