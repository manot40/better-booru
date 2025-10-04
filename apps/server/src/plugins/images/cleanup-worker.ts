import { db } from 'db';
import { s3 } from 'utils/s3';
import { Const } from './helpers';

export async function run() {
  let list: Bun.S3ListObjectsResponse | undefined;

  const cached = await db.query.postImagesTable.findMany({
    columns: { id: true },
    where: (t, { lt }) => lt(t.createdAt, new Date(Date.now() - Const.MAX_AGE * 1000)),
  });

  const set = new Set(cached.map((i) => i.id));

  const s3Opts: Bun.S3ListObjectsOptions = { prefix: 'images/preview/', fetchOwner: false };

  while (!list || list.contents?.length) {
    if (!list) list = await s3.list(s3Opts);
    else list = await s3.list({ ...s3Opts, startAfter: list.contents?.at(-1)?.key });

    const contents = list.contents || [];

    if (contents.length === 0) break;

    for (const item of contents) {
      const hash = item.key.split('/').pop()!;
      if (set.has(hash)) continue;

      await s3.delete(item.key);
      console.info('Deleted unused cache image:', hash);
    }
  }
}
