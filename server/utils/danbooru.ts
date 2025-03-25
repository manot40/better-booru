import type { Rating } from '~~/types/common';
import type { DanbooruData } from '../db/schema';

export const isDanbooru = (data: BooruResponse): data is DanbooruData[] => data[0] && !('owner' in data[0]);

export const convertDanbooruRating = (data: DanbooruData['rating']): Rating => {
  switch (data) {
    case 'g':
      return 'general';
    case 's':
      return 'sensitive';
    case 'q':
      return 'questionable';
    default:
      return 'explicit';
  }
};
