import type { Handler } from 'elysia/dist/types';

import { createIPX, ipxFSStorage, ipxHttpStorage } from 'ipx';

import { getCache, setCache, type HeaderMeta } from './cache';

const MAX_AGE = Bun.env.IPX_MAX_AGE ? +Bun.env.IPX_MAX_AGE : 60 * 60 * 24 * 7;
const MODIFIER_SEP = /[&,]/g;
const MODIFIER_VAL_SEP = /[:=_]/;

type Modifiers = NonNullable<Parameters<typeof ipx>[1]>;

const domains = ['img2.gelbooru.com', 'img3.gelbooru.com', 'img4.gelbooru.com', 'cdn.donmai.us'];

const ipx = createIPX({
  maxAge: MAX_AGE,
  storage: ipxFSStorage({ dir: './public/cache' }),
  httpStorage: ipxHttpStorage({ domains }),
});

export const elysiaIPXHandler: Handler = async ({ set, params, status, redirect }) => {
  try {
    const rawParam = params['*'];
    const [modString = '', ...ids] = rawParam.split('/');

    if (!modString) {
      throw new Error('IPX Modifier Not Provided');
    } else if (modString === '_') {
      const url = new URL(rawParam.replace(/.*_\//i, ''));

      if (!domains.includes(url.hostname)) {
        throw new Error(`Unallowed host for proxy: ${url.hostname}`);
      }

      const res = await fetch(url);
      set.headers['content-type'] = res.headers.get('content-type') || 'application/octet-stream';
      set.headers['cache-control'] = `public, max-age=${MAX_AGE}`;
      set.headers['content-length'] = res.headers.get('content-length') || undefined;

      return res.arrayBuffer();
    }

    const hash = Bun.MD5.hash(rawParam, 'hex');
    const cached = await getCache(hash);

    if (cached) {
      if (typeof cached == 'string') return redirect(cached, 302);

      set.headers['x-cache-status'] = 'HIT';
      Object.assign(set.headers, cached.meta);
      return cached.data;
    }

    const id = safeString(decodeURI(ids.join('/')));
    if (!id || id === '/') throw new Error(`Missing resource: ${id}`);

    const modifiers = <Modifiers>{};
    if (modString !== '_')
      for (const p of modString.split(MODIFIER_SEP)) {
        const [k, ...values] = p.split(MODIFIER_VAL_SEP);
        const key = <keyof Modifiers>safeString(k);
        modifiers[key] = values.map((v) => safeString(decodeURI(v))).join('_');
      }

    const prepare = ipx(id, modifiers);
    const { data, format } = await prepare.process();

    const now = new Date();
    const meta = <HeaderMeta>{
      expires: new Date(now.getTime() + MAX_AGE * 1000).toUTCString(),
      'content-type': format ? `image/${format}` : undefined,
      'cache-control': `max-age=${MAX_AGE}, public, s-maxage=${MAX_AGE}`,
      'last-modified': now.toUTCString(),
      'content-length': data.length,
    };

    Object.assign(set.headers, {
      ...meta,
      ['content-security-policy']: "default-src 'none'",
    });

    setCache(hash, { data, meta, maxAge: MAX_AGE });

    return data;
  } catch (e) {
    throw status(500, e);
  }
};

function safeString(input: string) {
  return JSON.stringify(input).replace(/^"|"$/g, '').replace(/\\+/g, '\\').replace(/\\"/g, '"');
}

function decodeURI(uri: string) {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
}
