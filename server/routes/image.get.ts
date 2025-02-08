export default defineEventHandler(async (evt) => {
  const { proxy } = getQuery(evt);
  if (typeof proxy != 'string') return createError({ statusCode: 404 });
  if (!proxy.includes('booru')) return createError({ statusCode: 400 });

  const res = await fetch(proxy);
  if (!res.ok)
    return createError({
      data: await res.text(),
      statusCode: res.status,
      statusText: res.statusText,
    });

  setResponseHeader(evt, 'content-type', res.headers.get('content-type') || 'application/octet-stream');
  setResponseHeader(evt, 'Cache-Control', 'public, max-age=31536000');
  return res.arrayBuffer();
});
