import type { Handler } from 'elysia/dist/types';

import { createIPX, ipxFSStorage, ipxHttpStorage } from 'ipx';

import { getCache, setCache, type HeaderMeta } from './cache';

const MAX_AGE = 60 * 60 * 24 * 7;
const MODIFIER_SEP = /[&,]/g;
const MODIFIER_VAL_SEP = /[:=_]/;

type Modifiers = NonNullable<Parameters<typeof ipx>[1]>;

const ipx = createIPX({
  maxAge: Bun.env.IPX_MAX_AGE ? +Bun.env.IPX_MAX_AGE : MAX_AGE,
  storage: ipxFSStorage({ dir: './public/cache' }),
  httpStorage: ipxHttpStorage({ domains: ['img3.gelbooru.com', 'cdn.donmai.us'] }),
});

export const elysiaIPXHandler: Handler = async ({ set, params, error }) => {
  try {
    const rawParam = params['*'];
    const [modString = '', ...ids] = rawParam.split('/');
    if (!modString) throw new Error('IPX Modifier Not Provided');

    const hash = Bun.MD5.hash(rawParam, 'hex');
    const cached = await getCache(hash);
    if (cached) {
      const { data, meta, rm } = cached;
      // When expired, remove file (SWR style).
      if (new Date(meta.expires).getTime() < Date.now()) rm();

      set.headers['x-cache-status'] = 'HIT';
      Object.assign(set.headers, meta);
      return data;
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

    set.headers['expires'] = new Date(now.getTime() + MAX_AGE * 1000).toUTCString();
    set.headers['last-modified'] = now.toUTCString();
    set.headers['cache-control'] = `max-age=${MAX_AGE}, public, s-maxage=${MAX_AGE}`;
    set.headers['content-length'] = data.length;
    set.headers['content-security-policy'] = "default-src 'none'";
    if (format) set.headers['content-type'] = `image/${format}`;

    setCache(hash, data, set.headers as HeaderMeta);

    return data;
  } catch (e) {
    console.error(Bun.inspect(e, { colors: true }));
    throw error(500, e);
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
