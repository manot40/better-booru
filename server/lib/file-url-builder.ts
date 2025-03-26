import { eq, sql, isNotNull } from 'drizzle-orm';

import { postTable as table } from '~~/server/db/schema';

const linkPrepend = sql<string>`,SUBSTR(${table.hash},1,2),'/',SUBSTR(${table.hash},3,2),'/',`;

export const file_url = sql<string>`CONCAT('/danbooru/original/'`
  .append(linkPrepend)
  .append(sql`${table.hash},'.',${table.file_ext})`);
export const sample_url =
  sql<Nullable>`CASE WHEN ${isNotNull(table.sample_ext)} THEN CONCAT('/danbooru/sample/'`
    .append(linkPrepend)
    .append(sql`'sample-',${table.hash},'.',${table.sample_ext}) END`);
export const preview_url =
  sql<Nullable>`CASE WHEN ${isNotNull(table.preview_ext)} THEN CONCAT('/danbooru/720x720/'`
    .append(linkPrepend)
    .append(sql`${table.hash},'.',${table.preview_ext}) END`);

type Nullable = string | null;
// export const sample_url = sql<string>`CASE WHEN ${eq(postTable.sample_width, postTable.width)} THEN `
//   .append(file_url)
//   .append(sql` ELSE CONCAT('/danbooru/sample/','sample-',${postTable.hash},'.jpg') END`);
