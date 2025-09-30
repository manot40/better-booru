import type { Context, HTTPHeaders, StatusMap } from 'elysia';

import Elysia from 'elysia';
import MemoryStore from 'lib/cache/memory';

const glob = new Bun.Glob('./public/**/*.html');
const cache = new MemoryStore<Uint8Array<ArrayBuffer>>();
const routes = new Set(
  Array.from(glob.scanSync({ absolute: true })).map((r) => {
    const route = r.split('/public').pop()!;
    const stripped = route.split('.');
    stripped.splice(-1);
    return stripped.join('.');
  })
);

export const spa = new Elysia()
  .use(loadRoutes)
  .onError(async ({ code, path, set, status, request }) => {
    const isHTML = request.headers.get('accept')?.includes('text/html');
    const isNotFound = code === 'NOT_FOUND';

    if (isNotFound && isHTML) {
      const html = await loadHtml('/404.html', set);
      return status(404, html);
    } else if (!isHTML && path.includes('.well-known')) {
      return status(404);
    }
  })
  .as('scoped');

function loadRoutes(app: Elysia) {
  app.get('/', async ({ set, status }) => {
    const html = await loadHtml('/index.html', set);
    return status(html ? 200 : 404, html);
  });

  for (const route of routes)
    app.get(route, async ({ set, status }: Context) => {
      const html = await loadHtml(`${route}.html`, set);
      return html || status(404);
    });

  return app;
}

async function loadHtml(path: string, set: SetMap) {
  const setHeaders = (byteLength: number, status = 200) => {
    set.status = status;
    set.headers['content-type'] = 'text/html';
    set.headers['content-length'] = byteLength;
  };

  if (cache.has(path)) {
    const cached = cache.get(path);
    setHeaders(cached.byteLength);
    return Buffer.from(cached).toString('utf8');
  }

  const file = Bun.file(`./public${path}`);
  if (!(await file.exists())) return null;
  const bytes = await file.bytes();

  setHeaders(bytes.byteLength);
  cache.set(path, bytes);

  return Buffer.from(bytes).toString('utf8');
}

type SetMap = {
  status?: number | keyof StatusMap;
  headers: HTTPHeaders;
};
