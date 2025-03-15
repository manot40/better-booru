import type { TagCategory } from '~~/types/common';

import { Cat, Copyright, Palette, TagIcon } from 'lucide-vue-next';

export function getIconFromCategory(cat: TagCategory) {
  switch (cat) {
    case 'artist':
      return Palette;
    case 'copyright':
      return Copyright;
    case 'character':
      return Cat;
    default:
      return TagIcon;
  }
}
