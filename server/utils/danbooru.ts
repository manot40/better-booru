import type { Post, Rating } from '~~/types/common';
import type { DanbooruResponse } from '~~/types/danbooru';

export const isDanbooru = (data: BooruResponse): data is DanbooruResponse[] =>
  'media_asset' in (data[0] || {});

export const convertDanbooruRating = (data: DanbooruResponse['rating']): Rating => {
  switch (data) {
    case 'g':
      return 'general';
    case 's':
      return 'sensitive';
    case 'q':
      return 'questionable';
    default:
      return 'explicit';
  }
};

export const getDanbooruImage = (data: DanbooruResponse) =>
  data.media_asset.variants.reduce(
    (acc, next) => {
      if (next.type === 'original') {
        acc.width = next.width;
        acc.height = next.height;
        acc.file_url = next.url;
      } else if (next.type === '720x720') {
        acc.sample_url = next.url;
        acc.sample_width = next.width;
        acc.sample_height = next.height;
      } else if (next.type === '360x360') {
        acc.preview_url = next.url;
        acc.preview_width = next.width;
        acc.preview_height = next.height;
      }
      return acc;
    },
    <ExtractedImage>{}
  );

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
