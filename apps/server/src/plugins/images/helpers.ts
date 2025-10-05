import sharp from 'sharp';

import { postImagesTable as imgTbl, DBPostData } from 'db/schema';
import { join } from 'node:path';

import { S3_ENABLED } from 'utils/s3';

const MAX_AGE = Bun.env.IPX_MAX_AGE ? +Bun.env.IPX_MAX_AGE : 60 * 60 * 24 * 7;
const CACHE_DIR = join(process.cwd(), '.cache/ipx');
const ENCODER_URL = Bun.env.IPX_ENCODER_URL;
const PREVIEW_PATH = 'images/preview' as const;
const MODIFIER_SEP = /[&,]/g;
const MODIFIER_VAL_SEP = /[:=_]/;
const ALLOWED_HOSTS = ['img2.gelbooru.com', 'img3.gelbooru.com', 'img4.gelbooru.com', 'cdn.donmai.us'];

export const Const = {
  MAX_AGE,
  CACHE_DIR,
  ENCODER_URL,
  PREVIEW_PATH,
  ALLOWED_HOSTS,
  MODIFIER_SEP,
  MODIFIER_VAL_SEP,
};

export const getHash = (url: string, modifiers: Record<'f' | 'w' | 'h', string>) =>
  Bun.MD5.hash(JSON.stringify({ id: url, ...modifiers }), 'hex');

export function getFileHandler(hash: string) {
  const a = hash.slice(0, 2);
  const b = hash.slice(2, 4);
  const path = join(CACHE_DIR, a, b, hash);
  return Bun.file(Bun.pathToFileURL(path));
}

export function reduceSize(item: PreviewCalc): null | [string, number, number] {
  let src = item.sample_url || item.preview_url || item.file_url;
  let width = item.sample_width || item.preview_width || item.width;
  let height = item.sample_height || item.preview_height || item.height;

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

  return [src, w, h];
}

export async function processImage(payload: ProcessPayload): Promise<ProcessedImage> {
  const { src, width, height, quality: q } = payload;
  const res = await fetch(src);

  if (!res.ok) {
    if (res.status === 404) return { error: 404, message: 'Image Not Found' };
    return { error: 500, message: `Failed to fetch image: ${res.status} ${res.statusText}` };
  }

  if (!res.headers.get('content-type')?.startsWith('image/')) {
    return { error: 400, message: 'Invalid Image Type' };
  }

  const quality = q ? (isNaN(+q) ? 80 : +q) : undefined;
  const theSharp = sharp(await res.bytes())
    .resize({ width, height })
    .webp({ quality });

  const data = await theSharp.toBuffer();
  const metadata = await theSharp.metadata();

  const meta = {
    loc: S3_ENABLED ? 'CDN' : 'LOCAL',
    type: 'PREVIEW',
    width: metadata.width,
    height: metadata.height,
    fileSize: data.byteLength,
    fileType: 'webp',
  } satisfies ImageMeta;

  return { data, meta };
}

type ImageMeta = Omit<typeof imgTbl.$inferInsert, 'id' | 'postId'>;
type ImageError = { error: 400 | 404 | 500; message: string };
type ImageResult = { data: Buffer<ArrayBufferLike>; meta: ImageMeta };
type ProcessedImage = ImageError | ImageResult;

export type ProcessPayload = {
  src: string;
  width: number;
  height: number;
  quality?: number;
};

type PreviewCalc = Pick<
  DBPostData,
  'width' | 'height' | 'sample_width' | 'sample_height' | 'preview_width' | 'preview_height'
> & {
  file_url: string;
  sample_url?: string | null;
  preview_url?: string | null;
};
