import { s3 } from 'utils/s3';
import { ipxMetaCache } from './cache';

export async function run() {
  let list: Bun.S3ListObjectsResponse | undefined;
  const set = new Set(ipxMetaCache.getEntries().map(([hash]) => hash));
  const s3Opts: Bun.S3ListObjectsOptions = { prefix: 'images/preview/', fetchOwner: false };

  while (!list || list.contents?.length) {
    if (!list) list = await s3.list(s3Opts);
    else list = await s3.list({ ...s3Opts, startAfter: list.contents?.at(-1)?.key });

    const contents = list.contents || [];

    if (contents.length === 0) break;

    for (const item of contents) {
      const hash = item.key.split('/').pop()!;
      if (set.has(hash)) continue;

      await s3.delete(item.key);
      console.info('Deleted unused cache image:', hash);
    }
  }
}
