import type { Post } from '@boorugator/shared/types';
import type { BooruResponse } from './common';
import type { DanbooruResponse } from '@boorugator/shared/types';

export const isDanbooru = (data: BooruResponse): data is DanbooruResponse[] =>
  'media_asset' in (data[0] || {});

export const getDanbooruImage = (data: DanbooruResponse): ExtractedImage => {
  const extracted = <ExtractedImage>{};
  if (data.media_asset.variants) {
    return data.media_asset.variants.reduce((acc, next) => {
      if (next.type === 'original') {
        acc.width = next.width;
        acc.height = next.height;
        acc.file_ext = next.file_ext;
      } else if (next.type === 'sample') {
        acc.sample_ext = next.file_ext || null;
        acc.sample_width = next.width || null;
        acc.sample_height = next.height || null;
      } else if (next.type === '720x720') {
        acc.preview_ext = next.file_ext || null;
        acc.preview_width = next.width || null;
        acc.preview_height = next.height || null;
      }
      return acc;
    }, extracted);
  } else {
    extracted.width = data.media_asset.image_width;
    extracted.height = data.media_asset.image_height;
    extracted.file_ext = data.file_ext;
    return extracted;
  }
};

export const mapDanbooruData = (data: DanbooruResponse) =>
  <Post>{
    id: data.id,
    hash: data.md5,
    image: `${data.md5}.${data.media_asset.file_ext}`,
    directory: data.id,
    change: 0,
    owner: 'danbooru',
    parent_id: data.parent_id,
    rating: data.rating,
    sample: true,
    score: data.fav_count,
    tags: data.tag_string,
    source: data.source,
    status: data.is_deleted ? 'deleted' : 'active',
    file_size: data.file_size,
    has_notes: data.has_notes || false,
    comment_count: 0,
    tags_grouping: {
      tag: data.tag_string_general,
      meta: data.tag_string_meta,
      artist: data.tag_string_artist,
      character: data.tag_string_character,
      copyright: data.tag_string_copyright,
    },
    ...getDanbooruImage(data),
  };

type ExtractedImage = Pick<
  Post,
  | 'sample_url'
  | 'sample_ext'
  | 'sample_height'
  | 'sample_width'
  | 'file_url'
  | 'file_ext'
  | 'width'
  | 'height'
  | 'preview_url'
  | 'preview_ext'
  | 'preview_width'
  | 'preview_height'
>;
