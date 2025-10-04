import { addTask } from 'plugins/images/lqip-worker';

const S3_URL = Bun.env.S3_PUBLIC_ENDPOINT ? new URL(Bun.env.S3_PUBLIC_ENDPOINT) : null;
const BASE_URL = Bun.env.BASE_URL ? new URL(Bun.env.BASE_URL) : null;

export function populatePreviewCache(post: PostData) {
  if (!post.lqip) {
    const preview = post.preview_url?.startsWith('http') ? new URL(post.preview_url) : null;
    addTask(preview?.toString() || post.sample_url || post.file_url, post.hash);
  } else {
    post.lqip = post.lqip.replaceAll('\n', '');
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
