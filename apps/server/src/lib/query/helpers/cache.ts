import { Const } from 'plugins/images/helpers';
import { addTask } from 'plugins/images/images-worker';

const S3_URL = Bun.env.S3_PUBLIC_ENDPOINT ? new URL(Bun.env.S3_PUBLIC_ENDPOINT) : null;
const BASE_URL = Bun.env.BASE_URL ? new URL(Bun.env.BASE_URL) : null;

export function populatePreviewCache(post: PostData) {
  if (!post.lqip) {
    const pre = post.preview_url;
    const preview = pre && Const.ALLOWED_HOSTS.includes(pre) ? new URL(pre) : null;
    addTask(preview?.toString() || post.sample_url || post.file_url, post.hash);
  } else {
    post.lqip = post.lqip.replaceAll('\n', '');
  }

  if (Const.ENCODER_URL) {
    const fileUrl = post.file_url.split('/').pop();
    post.file_url = new URL(`/encode/${fileUrl}`, Const.ENCODER_URL).toString();
  }

  const cacheRegex = new RegExp(`^https?://(${S3_URL?.hostname || '_'}|${BASE_URL?.hostname || '_'})`);
  const isCacheEligible = !post.preview_url || !cacheRegex.test(post.preview_url);

  if (!isCacheEligible) return;

  const path = `/images/${post.hash}`;
  post.preview_url = BASE_URL ? new URL(path, BASE_URL.origin).toString() : path;
}

type PostData = {
  hash: string;
  lqip: MaybeEmpty<string>;
  file_url: string;
  sample_url: MaybeEmpty<string>;
  preview_url: MaybeEmpty<string>;
};

type MaybeEmpty<T> = T | null | undefined;
