import { eq } from 'drizzle-orm';
import { db, $s } from 'db';

import { Const } from './helpers';

import { s3, S3_ENABLED } from 'utils/s3';

export async function run() {
  if (!S3_ENABLED) return;

  let list: Bun.S3ListObjectsResponse | undefined;

  const cached = await db.query.postImagesTable.findMany({
    columns: { id: true },
    where: (t, { lt }) => lt(t.createdAt, new Date(Date.now() - Const.MAX_AGE * 1000)),
  });

  const expired = new Set(cached.map((i) => i.id));

  const s3Opts: Bun.S3ListObjectsOptions = { prefix: 'images/preview/', fetchOwner: false };

  while (!list || list.contents?.length) {
    if (!list) list = await s3.list(s3Opts);
    else list = await s3.list({ ...s3Opts, startAfter: list.contents?.at(-1)?.key });

    const contents = list.contents || [];

    if (contents.length === 0) break;

    for (const item of contents) {
      const hash = item.key.split('/').pop()!;
      if (expired.has(hash)) {
        await s3.delete(item.key);
        await db.update($s.postImagesTable).set({ orphaned: true }).where(eq($s.postImagesTable.id, hash));
        console.info('Deleted unused cache image:', hash);
      }
    }
  }
}
