import RedisStore from 'lib/cache/redis';
import SQLiteStore from 'lib/cache/sqlite';

import createSharp from 'sharp';

import { log } from 'plugins/logger';
import { random } from 'utils/common';

import { eq } from 'drizzle-orm';
import { db, schema as $s } from 'db';

const TTL = 60 * 60 * 2;
const STORE_KEY = 'lqip_queue';
const lqipQueue = Bun.env.REDIS_URL ? new RedisStore(STORE_KEY) : new SQLiteStore(`.data/${STORE_KEY}.db`);

/** @internal */
async function run() {
  log('INFO', '[LQIP] Processing tasks');

  let task = await lqipQueue.pop();
  let taskCount = 0;
  while (task) {
    const [hash, url] = task;

    if (!url || /.*(mp4|webm|zip)$/.test(url)) {
      task = await lqipQueue.pop();
      continue;
    }

    const res = await fetch(url);
    const isPict = res.headers.get('content-type')?.startsWith('image/');

    if (!res.ok || !isPict) {
      task = await lqipQueue.pop();
      continue;
    }

    try {
      const lqip = await getLQIP(await res.bytes());
      await db
        .update($s.postTable)
        .set({ lqip })
        .where(eq($s.postTable.hash, hash))
        .then(() => new Promise((r) => setTimeout(r, random(100, 300))));
    } catch (e) {
      log('WARNING', `[LQIP] Failed to process task ${hash}. ${e}`);
    } finally {
      taskCount++;
      task = await lqipQueue.pop();
    }
  }

  log('INFO', `[LQIP] Processed: ${taskCount}`);
}

async function getLQIP(data: Uint8Array<ArrayBufferLike>) {
  const pipeline = createSharp(data)
    .blur(2)
    .resize({ width: 16, height: 16, fit: 'inside', kernel: 'cubic' })
    .webp({ quality: 30 });

  return await pipeline.toBuffer();
}

function addTask(url: URL): Promise<void>;
function addTask(url: string, hash: string): Promise<void>;
async function addTask(url: string | URL, hash?: string): Promise<void> {
  if (url instanceof URL) {
    hash = url.pathname
      .split('/')
      .pop()
      ?.replace(/(^sample\-|\.\w+)/g, '');
    if (!hash) throw new Error('Invalid URL');

    await lqipQueue.set(hash, url.toString(), TTL);
  } else if (typeof url == 'string' && hash) {
    await lqipQueue.set(hash, url, TTL);
  } else {
    throw new Error('Invalid arguments');
  }
}

export { addTask, run };
