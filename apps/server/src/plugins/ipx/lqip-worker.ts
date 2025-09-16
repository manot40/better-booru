import { join } from 'node:path';
import { existsSync, promises as fs } from 'node:fs';

import { s3, S3_ENABLED } from 'utils/s3';

import SQLiteStore from 'lib/cache/sqlite';

import createSharp from 'sharp';

import { eq } from 'drizzle-orm';
import { db, schema as $s } from 'db';

const lqipDir = join(process.cwd(), '.cache/lqip');
const lqipQueue = new SQLiteStore('.data/lqip_queue.db');

function addTask(url: URL): void;
function addTask(url: string, hash: string): void;
function addTask(url: string | URL, hash?: string) {
  if (url instanceof URL) {
    hash = url.pathname
      .split('/')
      .pop()
      ?.replace(/(^sample\-|\.\w+)/g, '');
    if (!hash) throw new Error('Invalid URL');

    lqipQueue.set(hash, url.toString());
  } else if (typeof url == 'string' && hash) {
    lqipQueue.set(hash, url);
  } else {
    throw new Error('Invalid arguments');
  }
}

/** @internal */
async function run() {
  const tasks = lqipQueue.getEntries();

  if (tasks.length === 0) return;
  else console.info('[LQIP] Processing', tasks.length, 'tasks');

  for (const [hash, url] of tasks) {
    const res = await fetch(url);
    const isPict = res.headers.get('content-type')?.startsWith('image/');

    if (!res.ok || !isPict) {
      if (!isPict) lqipQueue.delete(hash);
      continue;
    }

    try {
      const lqip = await getLQIP(await res.bytes());

      if (S3_ENABLED) {
        const s3File = s3.file(`images/lqip/${hash}`);
        await s3File.write(lqip, { type: 'image/webp', acl: 'public-read' });
      } else {
        if (!existsSync(lqipDir)) await fs.mkdir(lqipDir, { recursive: true });
        await Bun.file(join(lqipDir, hash)).write(lqip);
      }

      await db.update($s.postTable).set({ haveLQIP: true }).where(eq($s.postTable.hash, hash));
      lqipQueue.delete(hash);

      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      console.error(`[LQIP] Failed to process task ${hash}:`, e);
      continue;
    }
  }

  console.info('[LQIP] Processed:', tasks.length);
}

async function getLQIP(data: Uint8Array<ArrayBufferLike>) {
  const pipeline = createSharp(data)
    .blur(2)
    .resize({ width: 16, height: 16, fit: 'inside', kernel: 'cubic' })
    .webp({ quality: 30 });

  return await pipeline.toBuffer();
}

export { addTask, lqipDir, run };
