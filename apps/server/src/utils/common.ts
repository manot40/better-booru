import type { Post } from '@boorugator/shared/types';
import type { GelbooruData } from '@boorugator/shared/types';
import type { DanbooruResponse } from '@boorugator/shared/types';

import { isDanbooru, mapDanbooruData } from './danbooru';

export const isMetaTag = (category: number) => category !== 0;

export const isArrEmpty = (arr: any[]) => arr.length === 0;

export function processBooruData(data: BooruResponse): Post[] {
  if (isDanbooru(data)) return data.filter((v) => !!v.media_asset.variants).map(mapDanbooruData);
  return data.map((raw) => {
    const { directory, change, owner, status, has_notes, comment_count, md5, ...rest } = raw;
    return {
      file_size: 0,
      preview_ext: '',
      ...rest,
      hash: md5,
      pixiv_id: null,
      has_notes: false,
      created_at: null,
    };
  });
}

export const random = (a: number, b: number) => Math.floor(Math.random() * (b - a) + a);

export type BooruResponse = DanbooruResponse[] | GelbooruData[];
