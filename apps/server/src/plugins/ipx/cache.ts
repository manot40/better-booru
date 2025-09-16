import { SQLiteStore } from 'lib/cache/sqlite';
import { s3, S3_ENABLED } from 'utils/s3';

import { destr } from 'destr';
import { getFileHandler, type HeaderMeta, type IPXCacheOptions } from './helpers';

export const PREVIEW_PATH = 'images/preview';
export const ipxMetaCache = new SQLiteStore('.data/ipx_cache.db');

export async function setCache(hash: string, options: IPXCacheOptions) {
  const { data, meta, maxAge } = options;

  ipxMetaCache.set(hash, JSON.stringify(meta), maxAge);

  if (S3_ENABLED) {
    const file = s3.file(`${PREVIEW_PATH}/${hash}`);
    await file.write(data, { acl: 'public-read', type: meta['content-type'] });
    return new URL(`/${file.name}`, Bun.env.S3_PUBLIC_ENDPOINT);
  } else {
    await getFileHandler(hash).write(data);
  }
}

export async function getCache(hash: string) {
  const fileMeta = ipxMetaCache.get(hash);
  const fileHandler = getFileHandler(hash);

  if (!fileMeta) return;

  if (S3_ENABLED) {
    const s3File = s3.file(`${PREVIEW_PATH}/${hash}`);
    const s3PublicEndpoint = Bun.env.S3_PUBLIC_ENDPOINT;

    if (s3PublicEndpoint && (await s3File.exists())) {
      return new URL(`/${s3File.name}`, s3PublicEndpoint);
    }
  }

  const fileExists = await fileHandler.exists();
  if (!fileExists) {
    ipxMetaCache.delete(hash);
    return;
  }

  const meta = destr<HeaderMeta>(fileMeta);
  const data = await fileHandler.arrayBuffer();

  return { data, meta };
}
