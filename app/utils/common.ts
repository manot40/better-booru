import type { BooruData } from '~~/types/booru';

export const randomInt = (from: number, to: number) => Math.floor(Math.random() * (to - from + 1) + from);

export function handleImageError(e: Event, item: BooruData) {
  const el = <HTMLImageElement>e.currentTarget;
  const retry = isNaN(+el.dataset.retry!) ? 0 : +el.dataset.retry!;
  if (el.src === item.preview_url) return;
  else if (retry > 6) return;

  el.dataset.retry = `${retry + 1}`;
  if (el.src === item.file_url) {
    el.src = item.file_url.replace('org/image', 'org//image');
  } else if (el.src === item.sample_url) {
    el.src = item.sample_url.replace('org/sample', 'org//sample');
  } else if (el.src.includes('org//sample')) {
    el.src = item.file_url;
  } else {
    el.src = item.preview_url;
  }

  const parent = el.parentElement;
  if (parent instanceof HTMLElement) parent.dataset.pswpSrc = el.src;
}
