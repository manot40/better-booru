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
      .onConflictDoUpdate({
        set: { id: meta.id, orphaned: false, updatedAt: new Date() },
        target: [imgTbl.postId, imgTbl.type],
      });

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
    where: (t, { and, eq }) => and(eq(t.id, hash), eq(t.orphaned, false)),
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
    await db.update(imgTbl).set({ orphaned: true }).where(eq(imgTbl.id, hash));
    return;
  }

  const data = await fileHandler.arrayBuffer();

  return { data, meta };
}

export type CachePayload = typeof imgTbl.$inferInsert;
