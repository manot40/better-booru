export default defineEventHandler(async (evt) => {
  const { proxy } = getQuery(evt);
  if (typeof proxy != 'string') return createError({ statusCode: 404 });
  if (!proxy.includes('booru')) return createError({ statusCode: 400 });

  const url = new URL(proxy);
  const cacheKey = `/original/${url.hostname}/${url.pathname.split('/').pop()}`;

  const cached = await cacheStore.get(cacheKey);
  if (cached) {
    Object.entries(cached.meta).forEach(([key, value]) => setResponseHeader(evt, key, value));
    return cached.data;
  }

  const res = await fetch(proxy);
  if (!res.ok)
    return createError({
      data: await res.text(),
      statusCode: res.status,
      statusText: res.statusText,
    });

  setResponseHeader(evt, 'content-type', res.headers.get('content-type') || 'application/octet-stream');
  setResponseHeader(evt, 'Cache-Control', 'public, max-age=31536000');

  const buffer = Buffer.from(await res.arrayBuffer());
  cacheStore.set(cacheKey, { data: buffer, meta: evt.node.res.getHeaders() });
  return new Blob([buffer]);
});
