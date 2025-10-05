import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { db, $s } from 'db';

import { Const } from './helpers';
import { s3, S3_ENABLED } from 'utils/s3';

const imgTbl = $s.postImagesTable;

export async function run() {
  const cached = await db.query.postImagesTable.findMany({
    columns: { id: true },
    where: (t, { and, eq, lt }) =>
      and(
        lt(t.createdAt, new Date(Date.now() - Const.MAX_AGE * 1000)),
        eq(t.orphaned, false),
        eq(t.type, 'PREVIEW')
      ),
  });

  for (const cache of cached) {
    if (S3_ENABLED) {
      await s3.delete(`${Const.PREVIEW_PATH}/${cache.id}`).catch(() => void 0);
    } else {
      const file = Bun.file(join(Const.CACHE_DIR, cache.id));
      if (await file.exists()) await file.delete();
    }

    await db.update(imgTbl).set({ orphaned: true }).where(eq(imgTbl.id, cache.id));
  }
}
