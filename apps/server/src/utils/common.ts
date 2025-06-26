import type { Cookie } from 'elysia';
import type { GelbooruData } from '@boorugator/shared/types';
import type { DanbooruResponse } from '@boorugator/shared/types';
import type { Post, UserConfig } from '@boorugator/shared/types';

import { STATIC } from '@boorugator/shared';
import { isDanbooru, mapDanbooruData } from './danbooru';

export function processBooruData(data: BooruResponse): Post[] {
  if (isDanbooru(data)) return data.filter((v) => !!v.media_asset.variants).map(mapDanbooruData);
  return data.map((raw) => {
    const { directory, change, owner, status, has_notes, comment_count, md5, ...rest } = raw;
    return { file_size: 0, ...rest, hash: md5, pixiv_id: null, has_notes: false, created_at: null };
  });
}

export const getUserConfig = (cookie: Record<string, Cookie<string | undefined>>) => {
  const cookieStr = cookie[STATIC.keys.userConfig];
  try {
    if (cookieStr.value) return <UserConfig>JSON.parse(cookieStr.value);
  } catch {}
};

export const random = (a: number, b: number) => Math.floor(Math.random() * (b - a) + a);

export type BooruResponse = DanbooruResponse[] | GelbooruData[];
