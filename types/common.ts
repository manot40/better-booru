export type Rating = 'general' | 'explicit' | 'sensitive' | 'questionable';
export type RatingQuery = Rating | `-${Rating}` | 'all';

export type FileExt = 'jpg' | 'png' | 'webp' | 'mp4' | 'webm';

export type Provider = 'danbooru' | 'gelbooru';

export type TagCategoryID = 0 | 1 | 2 | 3 | 4 | 5;
export type TagCategory = 'character' | 'tag' | 'meta' | 'artist' | 'copyright';
export type TagsGroup = Record<TagCategory, string>;

export interface UserConfig {
  column?: 1 | 2 | 3 | 4;
  rating?: RatingQuery[];
  provider: Provider;
  hideNSFW?: boolean;
  browseMode?: 'infinite' | 'paginated';
  historyMode?: 'url_query' | 'session' | 'cookie';
}

export interface BooruData {
  id: number;
  tags: string;
  hash: string;
  score: Nullable<number>;
  rating: Rating;
  source: string;
  pixiv_id?: number;
  parent_id?: number;

  width: number;
  height: number;
  file_url: string;
  file_ext: FileExt;
  sample_url: string;
  sample_height: number;
  sample_width: number;
  preview_url?: string | null;
  preview_width?: number | null;
  preview_height?: number | null;

  has_notes: boolean;
  comment_count: number;
  tags_grouping?: TagsGroup;
}

export type Post = Omit<
  BooruData,
  | 'directory'
  | 'change'
  | 'owner'
  | 'image'
  | 'sample'
  | 'parent_id'
  | 'status'
  | 'has_notes'
  | 'comment_count'
>;
export type BooruMeta = { limit: number; offset: number; count: number };

export interface PostList {
  meta?: BooruMeta;
  post: Post[];
}

export interface ListParams {
  page: number;
  tags?: string;
  limit?: number;
  last_id?: number;
}

export interface Autocomplete {
  type?: 'tag';
  label: string;
  value: string;
  category: TagCategory;
  post_count?: string;
}
