import type { Cron } from 'croner';

import SQLiteStore from 'lib/cache/sqlite';

import createSharp from 'sharp';

import { random } from 'utils/common';

import { eq } from 'drizzle-orm';
import { db, schema as $s } from 'db';

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
async function run(store: unknown) {
  const cron = (store as { cron: { lqip_worker: Cron } }).cron.lqip_worker;
  const tasks = lqipQueue.getEntries();
  const initial = cron.currentRun()?.valueOf() || 0;

  if (tasks.length === 0) return;
  else console.info('[LQIP] Processing', tasks.length, 'tasks');

  for (const [hash, url] of tasks) {
    const current = cron.currentRun()?.valueOf();

    if (initial !== current) return;
    if (/.*(mp4|webm|zip)$/.test(url)) {
      lqipQueue.delete(hash);
      continue;
    }

    const res = await fetch(url);
    const isPict = res.headers.get('content-type')?.startsWith('image/');

    if (!res.ok || !isPict) {
      if (!isPict) lqipQueue.delete(hash);
      continue;
    }

    try {
      const lqip = await getLQIP(await res.bytes());

      await db
        .update($s.postTable)
        .set({ lqip })
        .where(eq($s.postTable.hash, hash))
        .then(() => lqipQueue.delete(hash));

      await new Promise((r) => setTimeout(r, random(100, 600)));
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

export { addTask, run };
