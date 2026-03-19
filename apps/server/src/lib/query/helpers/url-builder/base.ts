import type { Schema } from 'db';

import { isNotNull, ne, sql } from 'drizzle-orm';

import { postTable } from 'db/schema';

const linkPre = (p: Schema['postTable']) => sql<string>`SUBSTR(${p.hash},1,2),'/',SUBSTR(${p.hash},3,2),'/',`;

export const createFileUrl = (p = postTable) =>
  sql<string>`CONCAT('https://cdn.donmai.us/original/',`
    .append(linkPre(p))
    .append(sql`${p.hash},'.',${p.file_ext})`);
export const file_url = createFileUrl();

export const createSampleUrl = (p = postTable) =>
  sql<Nullable>`CASE WHEN ${ne(p.sample_ext, '')} THEN CONCAT('https://cdn.donmai.us/sample/',`
    .append(linkPre(p))
    .append(sql`'sample-',${p.hash},'.',${p.sample_ext}) END`);
export const sample_url = createSampleUrl();

export const createPreviewUrl = (p = postTable) =>
  sql<Nullable>`CASE WHEN ${ne(p.preview_ext, '')} THEN CONCAT('https://cdn.donmai.us/720x720/',`
    .append(linkPre(p))
    .append(sql`${p.hash},'.',${p.preview_ext}) END`);
export const preview_url = createPreviewUrl();

export const createLqip = (p = postTable) =>
  sql<Nullable>`CASE WHEN ${isNotNull(p.lqip)} THEN CONCAT('data:image/webp;base64,', encode(${p.lqip}, 'base64')) END`;
export const lqip = createLqip();

export type Nullable<T extends string = string> = T | null;
