export interface BooruData {
  preview_url: string;
  sample_url: string;
  file_url: string;
  directory: number;
  hash: string;
  width: number;
  height: number;
  id: number;
  image: string;
  change: number;
  owner: 'danbooru';
  parent_id: number;
  rating: 'general';
  sample: boolean;
  sample_height: number;
  sample_width: number;
  score: null;
  tags: string;
  source: string;
  status: 'active';
  has_notes: boolean;
  comment_count: number;
}

export interface BooruParams {
  page: number;
  tags?: string;
  limit?: number;
  last_id?: number;
}

export interface BooruAutocomplete {
  label: string;
  value: string;
}
