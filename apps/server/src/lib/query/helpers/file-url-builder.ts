import { eq, isNotNull, ne, sql } from 'drizzle-orm';

import { S3_ENABLED } from 'utils/s3';
import { postTable as p, postImagesTable as img } from 'db/schema';

const S3_URL = (S3_ENABLED && Bun.env.S3_PUBLIC_ENDPOINT) || '';
const BASE_URL = Bun.env.BASE_URL || '';

const linkPre = sql<string>`SUBSTR(${p.hash},1,2),'/',SUBSTR(${p.hash},3,2),'/',`;
const locToHost = sql<string>`CASE WHEN ${eq(img.loc, 'CDN')} THEN '${sql.raw(S3_URL)}' ELSE '${sql.raw(BASE_URL)}' END`;
const imagePath = sql`CONCAT((${locToHost}),'/',${img.path})`;

export const file_url = sql<string>`COALESCE(`
  .append(sql`MAX(CASE WHEN ${eq(img.type, 'ORIGINAL')} THEN ${imagePath} END),`)
  .append(sql`CONCAT('https://cdn.donmai.us/original/',${linkPre}`)
  .append(sql`${p.hash},'.',${p.file_ext}))`)
  .as('file_url');
export const sample_url =
  sql<Nullable>`CASE WHEN ${ne(p.sample_ext, '')} THEN CONCAT('https://cdn.donmai.us/sample/',${linkPre}`
    .append(sql`'sample-',${p.hash},'.',${p.sample_ext}) END`)
    .as('sample_url');
export const preview_url = sql<Nullable>`COALESCE(`
  .append(sql`MAX(CASE WHEN ${eq(img.type, 'PREVIEW')} THEN ${imagePath} END),`)
  .append(sql`CASE WHEN ${ne(p.preview_ext, '')} THEN CONCAT('https://cdn.donmai.us/720x720/',${linkPre}`)
  .append(sql`${p.hash},'.',${p.preview_ext}) END)`)
  .as('preview_url');

export const lqip =
  sql<Nullable>`CASE WHEN ${isNotNull(p.lqip)} THEN CONCAT('data:image/webp;base64,', encode(${p.lqip}, 'base64')) END`.as(
    'lqip'
  );

type Nullable = string | null;
