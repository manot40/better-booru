import type { LogPayload } from '../types';

import { promises as fs } from 'fs';
import { dirname } from 'path';

import { buildLogMessage } from '../core/buildLogMessage';

const dirCache = new Set<string>();

async function ensureDirectoryExists(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  if (!dirCache.has(dir)) {
    await fs.mkdir(dir, { recursive: true });
    dirCache.add(dir);
  }
}

export async function logToFile(filePath: string, opts: LogPayload): Promise<void> {
  await ensureDirectoryExists(filePath);
  const logMessage = buildLogMessage({ ...opts, useColors: false }) + '\n';
  await fs.appendFile(filePath, logMessage, { flag: 'a' });
}
