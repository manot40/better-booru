import type { Post } from 'booru-shared/types';
import type { BooruResponse } from './common';
import type { DanbooruResponse } from 'booru-shared/types';

export const isDanbooru = (data: BooruResponse): data is DanbooruResponse[] =>
  'media_asset' in (data[0] || {});

export const getDanbooruImage = (data: DanbooruResponse) => {
  const extracted = <ExtractedImage>{};
  return data.media_asset.variants.reduce((acc, next) => {
    if (next.type === 'original') {
      acc.file_url = next.url;
      acc.width = next.width;
      acc.height = next.height;
    } else if (next.type === 'sample') {
      acc.sample_url = next.url;
      acc.sample_width = next.width;
      acc.sample_height = next.height;
    } else if (next.type === '720x720') {
      acc.preview_url = next.url;
      acc.preview_width = next.width;
      acc.preview_height = next.height;
    }
    return acc;
  }, extracted);
};

type ExtractedImage = Pick<
  Post,
  | 'sample_url'
  | 'sample_height'
  | 'sample_width'
  | 'file_url'
  | 'width'
  | 'height'
  | 'preview_url'
  | 'preview_width'
  | 'preview_height'
>;
