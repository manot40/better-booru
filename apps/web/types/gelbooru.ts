import type { BooruData, PostList } from './common';

export interface GelbooruData extends BooruData {
  md5: string;
  hash: never;
  post_locked: boolean;
  has_comments: boolean;
}
export interface GelbooruResponse {
  post: GelbooruData[];
  '@attributes': NonNullable<PostList['meta']>;
}
