import { eq } from 'drizzle-orm';
import { db, $s } from 'db';

import { s3, S3_ENABLED } from 'utils/s3';

import { getFileHandler, CachePayload } from './helpers';

export const PREVIEW_PATH = 'images/preview';

export async function setCache(payload: CachePayload) {
  const { data, ...meta } = payload;

  const writeMeta = () => db.insert($s.postImagesTable).values(meta);

  if (S3_ENABLED) {
    const file = s3.file(`${PREVIEW_PATH}/${meta.id}`);
    await file.write(data, { acl: 'public-read', type: `image/${meta.fileType}` }).then(writeMeta);
    return new URL(`/${file.name}`, Bun.env.S3_PUBLIC_ENDPOINT);
  } else {
    await getFileHandler(meta.id).write(data).then(writeMeta);
  }
}

export async function getCache(hash: string) {
  const meta = await db.query.postImagesTable.findFirst({
    where: (t, { eq }) => eq(t.id, hash),
  });

  if (!meta) return;

  if (meta.loc === 'CDN') {
    const s3File = s3.file(`${PREVIEW_PATH}/${hash}`);
    const s3PublicEndpoint = Bun.env.S3_PUBLIC_ENDPOINT;

    if (s3PublicEndpoint && (await s3File.exists())) {
      return new URL(`/${s3File.name}`, s3PublicEndpoint);
    }
  }

  const fileHandler = getFileHandler(hash);
  const fileExists = await fileHandler.exists();

  if (!fileExists) {
    await db.delete($s.postImagesTable).where(eq($s.postImagesTable.id, hash));
  }

  const data = await fileHandler.arrayBuffer();

  return { data, meta };
}
