import { getHash, processImage, type ProcessPayload } from './helpers';

import RedisStore from 'lib/cache/redis';
import SQLiteStore from 'lib/cache/sqlite';

import destr from 'destr';
import createSharp from 'sharp';

import { log } from 'plugins/logger';
import { random } from 'utils/common';

import { eq } from 'drizzle-orm';
import { db, schema as $s } from 'db';
import { setCache } from './cache';

const TTL = 60 * 60 * 2;
const STORE_KEY = 'image_queue';
const imageQueue = Bun.env.REDIS_URL ? new RedisStore(STORE_KEY) : new SQLiteStore(`.data/${STORE_KEY}.db`);

/** @internal */
async function run() {
  const size = await imageQueue.size();
  if (size === 0) return;

  log('INFO', `[IMAGE] Processing ${size} tasks`);

  let task = await imageQueue.pop();
  let taskCount = 0;
  while (task) {
    const [hash, dataStr] = task;

    const post = await db.query.postTable.findFirst({
      where: (t, { eq }) => eq(t.hash, hash),
    });

    if (!post) {
      task = await imageQueue.pop();
      continue;
    }

    let imgData: Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>;
    if (dataStr.startsWith('http')) {
      if (/.*(mp4|webm|zip)$/.test(dataStr)) {
        task = await imageQueue.pop();
        continue;
      }

      const res = await fetch(dataStr);
      const isPict = res.headers.get('content-type')?.startsWith('image/');

      if (!res.ok || !isPict) {
        task = await imageQueue.pop();
        continue;
      }

      imgData = await res.bytes();
    } else {
      const taskData = destr<TaskPayload>(dataStr);
      const processed = await processImage(taskData);

      if ('error' in processed) {
        task = await imageQueue.pop();
        continue;
      }

      const id = getHash(taskData.src, {
        f: 'webp',
        w: taskData.width.toString(),
        h: taskData.height.toString(),
      });

      await setCache(processed.data, { id, postId: post.id, ...processed.meta });
      imgData = processed.data;
    }

    try {
      const lqip = await getLQIP(imgData);
      await db
        .update($s.postTable)
        .set({ lqip })
        .where(eq($s.postTable.hash, hash))
        .then(() => new Promise((r) => setTimeout(r, random(100, 300))));
    } catch (e) {
      log('WARNING', `[IMAGE] Failed to process task ${hash}. ${e}`);
    } finally {
      taskCount++;
      task = await imageQueue.pop();
    }
  }

  log('INFO', `[IMAGE] Processed: ${taskCount}`);
}

async function getLQIP(data: Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>) {
  const pipeline = createSharp(data)
    .blur(2)
    .resize({ width: 16, height: 16, fit: 'inside', kernel: 'cubic' })
    .webp({ quality: 30 });

  return await pipeline.toBuffer();
}

function addTask(payload: TaskPayload): Promise<void>;
function addTask(url: string, hash: string): Promise<void>;
async function addTask($1: string | TaskPayload, hash?: string): Promise<void> {
  if (typeof $1 == 'string' && hash) {
    await imageQueue.set(hash, $1, TTL, false);
  } else if (typeof $1 == 'object' && 'hash' in $1) {
    await imageQueue.set($1.hash, JSON.stringify($1), TTL);
  } else throw new Error('Invalid arguments');
}

export type TaskPayload = ProcessPayload & { hash: string };

export { addTask, run };
