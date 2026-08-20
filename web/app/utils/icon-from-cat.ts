import { Cat, Copyright, Palette, TagIcon } from '@lucide/vue';

export enum EnumTagCategory {
  General,
  Artist,
  Unknown,
  Copyright,
  Character,
  Meta,
}

export function getIconFromCategory(cat: EnumTagCategory) {
  switch (cat) {
    case EnumTagCategory.Artist:
      return Palette;
    case EnumTagCategory.Copyright:
      return Copyright;
    case EnumTagCategory.Character:
      return Cat;
    default:
      return TagIcon;
  }
}
