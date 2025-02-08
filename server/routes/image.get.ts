export default defineEventHandler((evt) => {
  const { proxy } = getQuery(evt);
  if (typeof proxy != 'string') return createError({ statusCode: 404 });
  if (!proxy.includes('booru')) return createError({ statusCode: 400 });
  return fetch(proxy);
});
