import type { H3Event } from 'h3';

import type { GelbooruData } from '~~/types/gelbooru';
import type { Post, UserConfig } from '~~/types/common';

export function processBooruData(data: BooruResponse): Post[] {
  return data.map((raw) => {
    const { directory, change, owner, status, has_notes, comment_count, md5, ...rest } = raw;
    rest.sample_url = imgAlias(rest.sample_url, 'gelbooru');
    rest.preview_url = imgAlias(rest.preview_url, 'gelbooru');
    return { ...rest, hash: md5, pixiv_id: null, has_notes: false, created_at: null };
  });
}

export const getUserConfig = (evt: H3Event<any>) => {
  const cookieStr = getCookie(evt, STATIC.keys.userConfig);
  try {
    if (cookieStr) return <UserConfig>JSON.parse(cookieStr);
  } catch {}
};

export type BooruResponse = GelbooruData[];
