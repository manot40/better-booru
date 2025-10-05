import { eq } from 'drizzle-orm';
import { db, $s } from 'db';

import { s3, S3_ENABLED } from 'utils/s3';
import { Const, getFileHandler } from './helpers';

const imgTbl = $s.postImagesTable;

export async function setCache(data: Buffer<ArrayBufferLike>, meta: CachePayload) {
  const writeMeta = () =>
    db
      .insert(imgTbl)
      .values(meta)
      .onConflictDoUpdate({ target: imgTbl.id, set: { orphaned: false } });

  if (S3_ENABLED) {
    const file = s3.file(`${Const.PREVIEW_PATH}/${meta.id}`);
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
    const s3File = s3.file(`${Const.PREVIEW_PATH}/${hash}`);
    const s3PublicEndpoint = Bun.env.S3_PUBLIC_ENDPOINT;

    if (s3PublicEndpoint && (await s3File.exists())) {
      return new URL(`/${s3File.name}`, s3PublicEndpoint);
    }
  }

  const fileHandler = getFileHandler(hash);
  const fileExists = await fileHandler.exists();

  if (!fileExists) {
    await db.delete(imgTbl).where(eq(imgTbl.id, hash));
  }

  const data = await fileHandler.arrayBuffer();

  return { data, meta };
}

export type CachePayload = typeof imgTbl.$inferInsert;
