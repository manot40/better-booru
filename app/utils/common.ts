import type { Post } from '~~/types/common';
import type { AsyncDataRequestStatus } from '#app';

export const randomInt = (from: number, to: number) => Math.floor(Math.random() * (to - from + 1) + from);

export const isPend = (status: AsyncDataRequestStatus) => status === 'pending';

export const unwrapRef = <T = any>(v: MaybeRef<T>) => (isRef(v) ? v.value : v);

export function handleImageError(e: Event, item: Post) {
  const el = <HTMLImageElement>e.currentTarget;
  const retry = isNaN(+el.dataset.retry!) ? 0 : +el.dataset.retry!;

  if (el.src === item.preview_url) return;
  else if (retry > 4) {
    el.src = item.preview_url;
    return;
  }

  el.dataset.retry = `${retry + 1}`;
  if (el.src === item.file_url) {
    el.src = item.file_url.replace('org/image', 'org//image');
  } else if (el.src.includes('org/sample')) {
    el.src = item.sample_url.replace('org/sample', 'org//sample');
  } else if (el.src.includes('org//')) {
    el.src = el.src + `?${item.id}`;
  } else if (el.src.includes('?')) {
    el.src = el.src.replace('org//', 'org/');
  }
}

export const createBooruURL = (id: number) => {
  const config = useUserConfig();
  const hostname = config.provider === 'safebooru' ? 'safebooru.org' : 'gelbooru.com';
  return `https://${hostname}/index.php?page=post&s=view&id=${id}`;
};
