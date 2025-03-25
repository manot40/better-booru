export type Rating = 'g' | 's' | 'q' | 'e';
export type RatingQuery = Rating | `-${Rating}` | 'all';

export type FileExt = StringHint<'jpg' | 'png' | 'webp' | 'mp4' | 'webm'>;

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

export interface Post {
  id: number;
  hash: string;
  tags?: Nullable<string>;
  score?: Nullable<number>;
  rating: Rating;
  source?: Nullable<string>;
  pixiv_id?: Nullable<number>;
  parent_id?: Nullable<number>;
  has_notes: boolean;
  created_at?: Nullable<string | Date>;

  width: number;
  height: number;
  file_url: string;
  file_ext: FileExt;
  sample_url: string;
  sample_height: number;
  sample_width: number;
  preview_url?: Nullable<string>;
  preview_width?: Nullable<number>;
  preview_height?: Nullable<number>;
}

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
