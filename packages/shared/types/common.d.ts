export declare type Rating = 'g' | 's' | 'q' | 'e';
export declare type RatingQuery = Rating | `-${Rating}` | 'all';

type Nullable<T> = null | T;
type StringHint<T extends string> = T | (string & {});
export declare type FileExt = StringHint<'jpg' | 'png' | 'webp' | 'mp4' | 'webm'>;

export declare type Provider = 'danbooru' | 'gelbooru';

export declare type TagCategoryID = 0 | 1 | 2 | 3 | 4 | 5;
export declare type TagCategory = 'character' | 'tag' | 'meta' | 'artist' | 'copyright';
export declare type TagsGroup = Record<TagCategory, string>;

export declare interface UserConfig {
  column?: 1 | 2 | 3 | 4;
  rating?: RatingQuery[];
  provider: Provider;
  hideNSFW?: boolean;
  browseMode?: 'infinite' | 'paginated';
  historyMode?: 'url_query' | 'session' | 'cookie';
}

export declare interface UserData {
  lastBrowse: Record<string, [number, string?, number]>;
  [key: string]: unknown;
}

export declare interface BooruData {
  preview_url: string;
  preview_width: number;
  preview_height: number;
  sample_url: string;
  file_url: string;
  file_ext: FileExt;
  directory: number;
  hash: string;
  width: number;
  height: number;
  id: number;
  image: string;
  change: number;
  owner: 'danbooru';
  parent_id?: number;
  rating: Rating;
  sample: boolean;
  sample_height: number;
  sample_width: number;
  score: Nullable<number>;
  tags?: string;
  source: string;
  status: 'active';
  has_notes: boolean;
  comment_count: number;
  tags_grouping?: TagsGroup;
}

export declare interface Post {
  id: number;
  hash: string;
  lqip?: string;
  tags?: Nullable<string>;
  score?: Nullable<number>;
  rating: Rating;
  artist?: Nullable<string>;
  source?: Nullable<string>;
  pixiv_id?: Nullable<number>;
  parent_id?: Nullable<number>;
  has_notes: boolean;
  created_at?: Nullable<string | Date>;

  width: number;
  height: number;
  file_url: string;
  file_ext: FileExt;
  file_size: number;
  sample_url?: Nullable<string>;
  sample_ext?: Nullable<FileExt>;
  sample_width?: Nullable<number>;
  sample_height?: Nullable<number>;
  preview_url: string;
  preview_ext: FileExt;
  preview_width: number;
  preview_height: number;
}

export declare type BooruMeta = { limit: number; offset: number; count: number };

export declare interface PostList {
  meta?: BooruMeta;
  post: Post[];
}

export declare interface ListParams {
  page: number;
  tags?: string;
  limit?: number;
  last_id?: number;
  [q: string]: unknown;
}

export declare interface Autocomplete {
  type?: 'tag';
  label: string;
  value: string;
  category: TagCategory;
  post_count?: string;
}
