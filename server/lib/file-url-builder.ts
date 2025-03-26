import { eq, sql, isNotNull } from 'drizzle-orm';

import { postTable } from '~~/server/db/schema';

const linkPrepend = sql<string>`,SUBSTR(${postTable.hash},1,2),'/',SUBSTR(${postTable.hash},3,2),'/',`;

export const file_url = sql<string>`CONCAT('/danbooru/original/'`
  .append(linkPrepend)
  .append(sql`${postTable.hash},'.',${postTable.file_ext})`);
export const sample_url = sql<string>`CASE WHEN ${eq(postTable.sample_width, postTable.width)} THEN `
  .append(file_url)
  .append(sql` ELSE CONCAT('/danbooru/sample/','sample-',${postTable.hash},'.jpg') END`);
export const preview_url =
  sql<Nullable>`CASE WHEN ${isNotNull(postTable.preview_width)} THEN CONCAT('/danbooru/720x720/'`
    .append(linkPrepend)
    .append(sql`${postTable.hash},'.webp') END`);

type Nullable = string | null;
