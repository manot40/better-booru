import type { H3Event } from 'h3';
import type { GelbooruData } from '~~/types/gelbooru';
import type { BooruData, UserConfig, Post } from '~~/types/common';

export const processBooruData = (data: BooruData[] | GelbooruData[]): Post[] =>
  data.map((raw) => {
    const { directory, change, owner, parent_id, status, has_notes, comment_count, ...rest } = raw;
    const hash = 'md5' in rest ? rest.md5 : rest.hash;
    return { ...rest, hash };
  });

export const processRating = (rating: string | undefined, tags: string) => {
  if (!rating) return tags;
  const splitted = rating.split('+');
  const processed = splitted.reduce((acc, next, i) => {
    const plus = i === 0 ? '' : '+';
    if (!next) return acc;
    if (!next.startsWith('-')) return acc + `${plus}rating:${next}`;
    return acc + `${plus}-rating:${next.slice(1)}`;
  }, '');

  return processed ? `${tags ? tags + '+' : ''}${processed}` : tags;
};

export const getUserConfig = (evt: H3Event<any>) => {
  const cookieStr = getCookie(evt, STATIC.keys.userConfig);
  try {
    if (cookieStr) return <UserConfig>JSON.parse(cookieStr);
  } catch {}
};
