import type { HTTPHeaders } from 'elysia/dist/types';

import { SQLiteStore } from 'lib/cache/sqlite';
import { s3, S3_ENABLED } from 'utils/s3';

export const PREVIEW_PATH = 'images/preview';
export const ipxMetaCache = new SQLiteStore('.data/ipx_cache.db');

export async function setCache(hash: string, options: IPXCacheOptions) {
  const { data, meta, maxAge } = options;

  if (S3_ENABLED)
    await s3.file(`${PREVIEW_PATH}/${hash}`).write(data, {
      acl: 'public-read',
      type: meta['content-type'],
    });
  else await getFileHandler(hash).write(data);

  ipxMetaCache.set(hash, JSON.stringify(meta), maxAge);
}

export async function getCache(hash: string) {
  const fileMeta = ipxMetaCache.get(hash);
  const fileHandler = getFileHandler(hash);

  if (!fileMeta) return;

  if (S3_ENABLED) {
    const s3File = s3.file(`${PREVIEW_PATH}/${hash}`);
    const s3PublicEndpoint = Bun.env.S3_PUBLIC_ENDPOINT;

    if (!s3PublicEndpoint) return;
    if (await s3File.exists()) return `${s3PublicEndpoint}/${s3File.name}`;
  }

  const fileExists = await fileHandler.exists();
  if (!fileExists) {
    ipxMetaCache.delete(hash);
    return;
  }

  const data = await fileHandler.arrayBuffer();
  const meta = <HeaderMeta>JSON.parse(fileMeta);

  return { data, meta };
}

function getFileHandler(hash: string) {
  const path = `${process.cwd()}/.cache/ipx/${hash}`;
  return Bun.file(Bun.pathToFileURL(path));
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
