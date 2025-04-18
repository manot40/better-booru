import type { Cookie } from 'elysia';
import type { GelbooruData } from '@boorugator/shared/types';
import type { DanbooruResponse } from '@boorugator/shared/types';
import type { Post, UserConfig } from '@boorugator/shared/types';

import { STATIC } from '@boorugator/shared';
import { getDanbooruImage, isDanbooru } from './danbooru';

export function processBooruData(data: BooruResponse): Post[] {
  if (isDanbooru(data))
    return data
      .filter((v) => !!v.media_asset.variants)
      .map((raw) => ({
        id: raw.id,
        hash: raw.md5,
        image: `${raw.md5}.${raw.media_asset.file_ext}`,
        directory: raw.id,
        change: 0,
        owner: 'danbooru',
        parent_id: raw.parent_id,
        rating: raw.rating,
        sample: true,
        score: raw.fav_count,
        tags: raw.tag_string,
        source: raw.source,
        status: raw.is_deleted ? 'deleted' : 'active',
        file_size: raw.file_size,
        has_notes: raw.has_notes || false,
        comment_count: 0,
        tags_grouping: {
          tag: raw.tag_string_general,
          meta: raw.tag_string_meta,
          artist: raw.tag_string_artist,
          character: raw.tag_string_character,
          copyright: raw.tag_string_copyright,
        },
        ...getDanbooruImage(raw),
      }));
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
