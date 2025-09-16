import type { IPX } from 'ipx';
import type { HTTPHeaders } from 'elysia/dist/types';

const MAX_AGE = Bun.env.IPX_MAX_AGE ? +Bun.env.IPX_MAX_AGE : 60 * 60 * 24 * 7;
const MODIFIER_SEP = /[&,]/g;
const MODIFIER_VAL_SEP = /[:=_]/;
const ALLOWED_HOSTS = ['img2.gelbooru.com', 'img3.gelbooru.com', 'img4.gelbooru.com', 'cdn.donmai.us'];

export const Const = {
  MAX_AGE,
  ALLOWED_HOSTS,
  MODIFIER_SEP,
  MODIFIER_VAL_SEP,
};

type Modifiers = NonNullable<Parameters<IPX>[1]>;

export function getModifiers(url: string | string[], mod: string) {
  const id = safeString(typeof url == 'string' ? decodeURI(url) : decodeURI(url.join('/')));
  const modifiers = <Modifiers>{};

  if (!id || id === '/') throw new Error(`Missing resource: ${id}`);

  if (mod !== '_') {
    const parsedModString = mod
      .split(MODIFIER_SEP)
      .map((mod): [string, string] => {
        const [k, ...values] = mod.split(MODIFIER_VAL_SEP);
        return [safeString(k), values.map((v) => safeString(decodeURI(v))).join('_')];
      })
      .sort((a, b) => a[0].localeCompare(b[0]));

    Object.assign(modifiers, Object.fromEntries(parsedModString));
  }

  const hash = Bun.MD5.hash(JSON.stringify({ id, ...modifiers }), 'hex');

  return { hash, modifiers, id };
}

export function getFileHandler(hash: string) {
  const path = `${process.cwd()}/.cache/ipx/${hash}`;
  return Bun.file(Bun.pathToFileURL(path));
}

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

export type IPXCacheOptions = {
  data: string | Buffer<ArrayBufferLike>;
  meta: HeaderMeta;
  maxAge?: number;
};

export type HeaderMeta = Pick<
  Required<HTTPHeaders>,
  'expires' | 'last-modified' | 'cache-control' | 'content-type' | 'content-length'
>;
