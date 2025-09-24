import type { Post } from '@boorugator/shared/types';
import type { SlideData } from 'photoswipe';

export const postToSlide = (post: Post): SlideData => ({
  src: post.file_url,
  msrc: post.preview_url || post.sample_url || post.file_url,
  width: post.width,
  height: post.height,
});

export const createEstimateSize =
  (data: BooruResult['data'], container: Ref<HTMLElement | undefined>, gap = 8) =>
  (index: number, lane: number) => {
    const item = data.value?.post[index];
    if (!item) return 0;

    const [x, y] = imageAspectRatio(item.width, item.height);
    const spacer = lane === 1 ? 0 : gap * lane;
    const elWidth = (container.value?.clientWidth || window.innerWidth) - spacer;
    const relWidth = +(elWidth / lane) / x;
    const relHeight = relWidth * y + 2;

    return relHeight > 900 ? 900 : relHeight;
  };
