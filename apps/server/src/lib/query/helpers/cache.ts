import type { DBPostData } from 'db/schema';

import { S3_ENABLED } from 'utils/s3';
import { ipxMetaCache, PREVIEW_PATH } from 'lib/ipx/cache';
import { parseMeta, getModifiers, getLQIP, Const } from 'lib/ipx/helpers';

function reduceSize(item: PostFromDB): [string, string, number, number] {
  const src = item.sample_url || item.file_url;
  const width = item.sample_width || item.width;
  const height = item.sample_height || item.height;

  const square = width * height;
  const division = square > 2_000_000 ? 3 : square > 1_000_000 ? 2 : 1;
  const w = Math.round(width / division);
  const h = Math.round(height / division);
  const mod = `f_webp&w_${w}&h_${h}`;

  return [src, mod, w, h];
}

export function populatePreviewCache(post: PostFromDB) {
  const [src, mod, w, h] = reduceSize(post);

  post.preview_ext = 'webp';
  post.preview_width = w;
  post.preview_height = h;

  const uncachedKey = `/image/${mod}/${src}`;
  const s3PublicEndPoint = Bun.env.S3_PUBLIC_ENDPOINT;

  const { hash: cacheKey } = getModifiers(src, mod);
  const cached = parseMeta(ipxMetaCache.get(cacheKey));

  if (!cached) {
    post.preview_url = uncachedKey;
    return;
  }

  if (!s3PublicEndPoint || !S3_ENABLED) {
    post.preview_url = uncachedKey;
  } else {
    post.preview_url = `${s3PublicEndPoint}/${PREVIEW_PATH}/${cacheKey}`;
  }

  if (cached.lqip) {
    post.lqip = `data:image/webp;base64,${cached.lqip}`;
  } else {
    getLQIP(src)
      .then((lqip) => {
        const cloned = { ...cached, lqip: lqip.toString('base64') };
        return Bun.zstdCompress(Buffer.from(JSON.stringify(cloned), 'utf-8'));
      })
      .then((data) => {
        ipxMetaCache.set(cacheKey, data.toString('base64'), Const.MAX_AGE);
      });
  }
}

type PostFromDB = Pick<DBPostData, 'width' | 'height'> & {
  lqip?: string;
  file_url: string;
  sample_url?: string | null;
  sample_width?: number | null;
  sample_height?: number | null;
  preview_url?: string | null;
  preview_ext?: string | null;
  preview_width?: number | null;
  preview_height?: number | null;
};
