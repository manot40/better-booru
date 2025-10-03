import type { DBPostData } from 'db/schema';

import { destr } from 'destr';
import { S3_ENABLED } from 'utils/s3';

import { addTask } from 'plugins/ipx/lqip-worker';
import { ipxMetaCache, PREVIEW_PATH } from 'plugins/ipx/cache';
import { getModifiers, type HeaderMeta } from 'plugins/ipx/helpers';

function reduceSize(item: PostFromDB): null | [string, string, number, number] {
  let src = item.sample_url || item.file_url;
  let width = item.sample_width || item.width;
  let height = item.sample_height || item.height;

  const notPhoto = !/\.(webp|png|jp(e?)g)$/.test(src);
  if (notPhoto) {
    if (!item.preview_url) return null;
    src = item.preview_url;
    width = item.preview_width!;
    height = item.preview_height!;
  }

  const square = width * height;
  const division = square > 2_000_000 ? 3 : square > 1_000_000 ? 2 : 1;
  const w = Math.round(width / division);
  const h = Math.round(height / division);
  const mod = `f_webp&w_${w}&h_${h}`;

  return [src, mod, w, h];
}

export function populatePreviewCache(post: PostFromDB) {
  const reduced = reduceSize(post);
  if (!reduced) return;

  const [src, mod, w, h] = reduced;

  post.preview_ext = 'webp';
  post.preview_width = w;
  post.preview_height = h;

  const uncachedUrl = new URL(`/image/${mod}/${src}`, Bun.env.BASE_URL);
  const s3PublicEndPoint = Bun.env.S3_PUBLIC_ENDPOINT;

  const { hash: cacheKey } = getModifiers(src, mod);
  const cached = destr<HeaderMeta>(ipxMetaCache.get(cacheKey));

  if (!post.lqip) {
    const preview = post.preview_url?.startsWith('http') ? new URL(post.preview_url) : null;
    addTask(preview?.toString() || post.sample_url || post.file_url, post.hash);
  } else {
    post.lqip = post.lqip.replaceAll('\n', '');
  }

  const isDonmai = post.preview_url && post.preview_url.startsWith('https://cdn.donmai.us');
  if (!isDonmai) return;

  if (!cached) {
    post.preview_url = uncachedUrl.toString();
  } else if (!s3PublicEndPoint || !S3_ENABLED) {
    post.preview_url = uncachedUrl.toString();
  } else {
    post.preview_url = `${s3PublicEndPoint}/${PREVIEW_PATH}/${cacheKey}`;
  }
}

type PostFromDB = Pick<DBPostData, 'width' | 'height' | 'hash'> & {
  lqip?: string | null;
  file_url: string;
  sample_url?: string | null;
  sample_width?: number | null;
  sample_height?: number | null;
  preview_url?: string | null;
  preview_ext?: string | null;
  preview_width?: number | null;
  preview_height?: number | null;
};
