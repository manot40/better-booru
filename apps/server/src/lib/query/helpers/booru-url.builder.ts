import { isNotNull, ne, sql } from 'drizzle-orm';

import { postTable as p } from 'db/schema';

const linkPre = sql<string>`SUBSTR(${p.hash},1,2),'/',SUBSTR(${p.hash},3,2),'/',`;

export const file_url = sql<string>`CONCAT('https://cdn.donmai.us/original/',`
  .append(linkPre)
  .append(sql`${p.hash},'.',${p.file_ext})`);
export const sample_url =
  sql<Nullable>`CASE WHEN ${ne(p.sample_ext, '')} THEN CONCAT('https://cdn.donmai.us/sample/',`
    .append(linkPre)
    .append(sql`'sample-',${p.hash},'.',${p.sample_ext}) END`);
export const preview_url =
  sql<Nullable>`CASE WHEN ${ne(p.preview_ext, '')} THEN CONCAT('https://cdn.donmai.us/720x720/',`
    .append(linkPre)
    .append(sql`${p.hash},'.',${p.preview_ext}) END`);

export const lqip = sql<Nullable>`CASE WHEN ${isNotNull(p.lqip)} THEN CONCAT('data:image/webp;base64,', encode(${p.lqip}, 'base64')) END`;

export type Nullable<T extends string = string> = T | null;
