import type { H3Event } from 'h3';
import type { DanbooruData } from '../db/schema';
import type { GelbooruData } from '~~/types/gelbooru';
import type { BooruData, Post, UserConfig } from '~~/types/common';

export function processBooruData(data: BooruResponse): Post[] {
  if (isDanbooru(data)) return data.map((raw) => ({ ...raw, rating: convertDanbooruRating(raw.rating), image }));
  return data.map((raw) => {
    const { directory, change, owner, parent_id, status, has_notes, comment_count, ...rest } = raw;
    const hash = 'md5' in rest ? rest.md5 : rest.hash;
    rest.sample_url = imgAlias(rest.sample_url, 'gelbooru');
    rest.preview_url = imgAlias(rest.preview_url, 'gelbooru');
    return { ...rest, hash };
  });
}

export const getUserConfig = (evt: H3Event<any>) => {
  const cookieStr = getCookie(evt, STATIC.keys.userConfig);
  try {
    if (cookieStr) return <UserConfig>JSON.parse(cookieStr);
  } catch {}
};

export type BooruResponse = BooruData[] | GelbooruData[] | DanbooruData[];
