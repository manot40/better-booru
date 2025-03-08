export type Rating = 'general' | 'explicit' | 'sensitive' | 'questionable';
export type RatingQuery = Rating | `-${Rating}` | 'all';

export type FileExt = 'jpg' | 'png' | 'webp' | 'mp4' | 'webm';

export type Provider = 'danbooru' | 'gelbooru' | 'safebooru';

export interface UserConfig {
  column?: 1 | 2 | 3 | 4;
  rating?: RatingQuery[];
  provider: Provider;
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
  tags: string;
  source: string;
  status: 'active';
  has_notes: boolean;
  comment_count: number;
}

export type Post = Omit<
  BooruData,
  'directory' | 'change' | 'owner' | 'parent_id' | 'status' | 'has_notes' | 'comment_count'
>;

export interface PostList {
  meta?: { limit: number; offset: number; count: number };
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
  category?: 'character' | 'tag' | 'metadata' | 'artist' | 'copyright';
  post_count?: string;
}
