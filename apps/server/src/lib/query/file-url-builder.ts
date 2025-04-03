import { ne, sql, inArray } from 'drizzle-orm';

import { postTable as table } from '~~/server/db/schema';

const vid = ['webm', 'mp4', 'zip'];
const linkPrepend = sql<string>`,SUBSTR(${table.hash},1,2),'/',SUBSTR(${table.hash},3,2),'/',`;

export const file_url =
  sql<string>`CONCAT(CASE WHEN ${inArray(table.file_ext, vid)} THEN 'https://cdn.donmai.us/original/' ELSE '/danbooru/original/' END`
    .append(linkPrepend)
    .append(sql`${table.hash},'.',${table.file_ext})`);
export const sample_url = sql<Nullable>`CASE WHEN ${ne(table.sample_ext, '')} THEN CONCAT('/danbooru/sample/'`
  .append(linkPrepend)
  .append(sql`'sample-',${table.hash},'.',${table.sample_ext}) END`);
export const preview_url =
  sql<Nullable>`CASE WHEN ${ne(table.preview_ext, '')} THEN CONCAT('/danbooru/720x720/'`
    .append(linkPrepend)
    .append(sql`${table.hash},'.',${table.preview_ext}) END`);

type Nullable = string | null;
