import type { HTTPHeaders } from 'elysia/dist/types';

import { SQLiteStore } from 'lib/cache/sqlite';

const metadataCache = new SQLiteStore('.data/ipx_cache.db');

function getFileHandler(hash: string) {
  const path = `${process.cwd()}/.cache/ipx/${hash}`;
  return Bun.file(Bun.pathToFileURL(path));
}

export async function setCache(hash: string, options: IPXCacheOptions) {
  const { data, meta, maxAge } = options;
  const fileHandler = getFileHandler(hash);
  await fileHandler.write(data).then(() => {
    metadataCache.set(hash, JSON.stringify(meta), maxAge);
  });
}

export async function getCache(hash: string) {
  const fileMeta = metadataCache.get(hash);
  const fileHandler = getFileHandler(hash);
  const fileExists = await fileHandler.exists();

  if (!fileMeta || !fileExists) {
    if (fileExists) fileHandler.unlink().catch(() => void 0);
    else metadataCache.delete(hash);
    return;
  }

  const data = await fileHandler.arrayBuffer();
  const meta = <HeaderMeta>JSON.parse(fileMeta);

  return { data, meta };
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
