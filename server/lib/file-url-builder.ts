import { sql, isNotNull } from 'drizzle-orm';

import { postTable } from '~~/server/db/schema';

const linkPrepend = sql<string>`,SUBSTR(${postTable.hash},1,2),'/',SUBSTR(${postTable.hash},3,2),'/',`;

export const file_url = sql<string>`CONCAT('/danbooru/original/'`
  .append(linkPrepend)
  .append(sql`${postTable.hash},'.',${postTable.file_ext})`);
export const sample_url = sql<string>`CONCAT('/danbooru/sample/'`
  .append(linkPrepend)
  .append(sql`'sample-',${postTable.hash},'.',${postTable.file_ext})`);
export const preview_url =
  sql<Nullable>`CASE WHEN ${isNotNull(postTable.preview_width)} THEN CONCAT('/danbooru/720x720/'`
    .append(linkPrepend)
    .append(sql`${postTable.hash},'.webp') END`);

type Nullable = string | null;
