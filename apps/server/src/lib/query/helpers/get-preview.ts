import { $s } from 'db';
import { eq, sql } from 'drizzle-orm';

export const getPreview = <T extends 'width' | 'height'>(t: T) =>
  sql<number>`COALESCE(MAX(CASE WHEN ${eq($s.postImagesTable.type, 'PREVIEW')} THEN ${$s.postImagesTable[t]} END), ${$s.postTable[`preview_${t}`]})`.as(
    `preview_${t}`
  );
