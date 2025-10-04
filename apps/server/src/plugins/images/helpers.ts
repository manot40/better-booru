import { $s } from 'db';

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

export const getHash = (url: string, modifiers: Record<'f' | 'w' | 'h', string>) =>
  Bun.MD5.hash(JSON.stringify({ id: url, ...modifiers }), 'hex');

export function getFileHandler(hash: string) {
  const path = `${process.cwd()}/.cache/ipx/${hash}`;
  return Bun.file(Bun.pathToFileURL(path));
}

export function reduceSize(item: PostItem): null | [string, number, number] {
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

  return [src, w, h];
}

export type CachePayload = typeof $s.postImagesTable.$inferInsert & {
  data: string | Buffer<ArrayBufferLike>;
};

type PostItem = Pick<
  $s.DBPostData,
  'width' | 'height' | 'sample_width' | 'sample_height' | 'preview_width' | 'preview_height'
> & {
  file_url: string;
  sample_url?: string | null;
  preview_url?: string | null;
};
