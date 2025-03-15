import type { H3Event } from 'h3';
import type { GelbooruData } from '~~/types/gelbooru';
import type { DanbooruResponse } from '~~/types/danbooru';
import type { BooruData, Post, UserConfig } from '~~/types/common';

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
        rating: convertDanbooruRating(raw.rating),
        sample: true,
        score: raw.fav_count,
        tags: raw.tag_string,
        source: raw.source,
        status: raw.is_deleted ? 'deleted' : 'active',
        file_ext: raw.file_ext,
        has_notes: 0,
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

export type BooruResponse = BooruData[] | GelbooruData[] | DanbooruResponse[];
