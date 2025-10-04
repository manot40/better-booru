import { eq, sql } from 'drizzle-orm';

import { postImagesTable as img } from 'db/schema';

import * as Booru from './booru-url.builder';

const S3_URL = Bun.env.S3_PUBLIC_ENDPOINT || '';
const BASE_URL = Bun.env.BASE_URL || '';

const locToHost = sql<string>`CASE WHEN ${eq(img.loc, 'CDN')} THEN '${sql.raw(S3_URL)}' ELSE '${sql.raw(BASE_URL)}' END`;
const imagePath = sql`CONCAT((${locToHost}), '/images/', LOWER(${img.type}), '/', ${img.id})`;

export const lqip = Booru.lqip.as('lqip');

export const file_url = sql<string>`COALESCE(`
  .append(sql`MAX(CASE WHEN ${eq(img.type, 'ORIGINAL')} THEN ${imagePath} END),`)
  .append(sql`${Booru.file_url}${sql.raw(')')}`)
  .as('file_url');
export const sample_url = Booru.sample_url.as('sample_url');
export const preview_url = sql<Booru.Nullable>`COALESCE(`
  .append(sql`MAX(CASE WHEN ${eq(img.type, 'PREVIEW')} THEN ${imagePath} END),`)
  .append(sql`${Booru.preview_url}${sql.raw(')')}`)
  .as('preview_url');
