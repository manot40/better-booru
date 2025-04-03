import type { FileExt } from './common';

export interface DanbooruResponse {
  id: number;
  created_at: string;
  uploader_id: number;
  score: number;
  source: string;
  md5: string;
  last_comment_bumped_at: Nullable<string>;
  rating: 'g' | 's' | 'q' | 'e';
  image_width: number;
  image_height: number;
  tag_string: string;
  fav_count: number;
  file_ext: FileExt;
  last_noted_at: Nullable<string>;
  parent_id: number | null;
  has_children: boolean;
  approver_id: Nullable<number>;
  tag_count_general: number;
  tag_count_artist: number;
  tag_count_character: number;
  tag_count_copyright: number;
  file_size: number;
  up_score: number;
  down_score: number;
  is_pending: boolean;
  is_flagged: boolean;
  is_deleted: boolean;
  tag_count: number;
  updated_at: string;
  is_banned: boolean;
  pixiv_id: number | null;
  last_commented_at: Nullable<string>;
  has_active_children: boolean;
  bit_flags: number;
  tag_count_meta: number;
  has_notes: boolean;
  has_large: boolean;
  has_visible_children: boolean;
  media_asset: DanbooruAsset;
  tag_string_general: string;
  tag_string_character: string;
  tag_string_copyright: string;
  tag_string_artist: string;
  tag_string_meta: string;
  file_url: string;
  large_file_url: string;
  preview_file_url: string;
}

export interface DanbooruAsset {
  id: number;
  created_at: Date;
  updated_at: Date;
  md5: string;
  file_ext: FileExt;
  file_size: number;
  image_width: number;
  image_height: number;
  duration: Nullable<number>;
  status: 'active';
  file_key: string;
  is_public: boolean;
  pixel_hash: string;
  variants: Variant[];
}

interface Variant {
  type: DanbooruMediaType;
  url: string;
  width: number;
  height: number;
  file_ext: FileExt;
}

export type DanbooruMediaType = 'original' | 'sample' | '180x180' | '360x360' | '720x720';
