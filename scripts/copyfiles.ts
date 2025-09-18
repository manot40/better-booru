import { join, basename } from 'node:path';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';

import { S3_ENABLED, NUXT_DIR } from './common';

const DIST_DIR = join(process.cwd(), 'dist');
const SHARP_MOD = 'node_modules/@img';
const ARTIFACTS = 'apps/web/.output/public/**/*';

if (existsSync(DIST_DIR)) {
  rmSync(DIST_DIR, { recursive: true, force: true });
}

/** Copy server build files */
cpSync('./apps/server/dist', DIST_DIR, { recursive: true });
cpSync(join(process.cwd(), SHARP_MOD), join(DIST_DIR, SHARP_MOD), { recursive: true });

/**
 * Copy frontend build files:
 * Static assets will be uploaded to CDN (if enabled),
 * so they are not copied to the dist directory.
 */
if (!S3_ENABLED) {
  const assetsGlob = new Bun.Glob(join(process.cwd(), ARTIFACTS));

  for await (const filePath of assetsGlob.scan()) {
    const isNuxtFile = filePath.includes(`${NUXT_DIR}/`);

    let destination: string;
    if (isNuxtFile) {
      const fileName = filePath.replace(/.*\/.output\//g, '');
      destination = join(DIST_DIR, fileName);
    } else {
      const fileName = basename(filePath);
      destination = join(DIST_DIR, 'public', fileName);
    }

    cpSync(filePath, destination, { recursive: true });
  }
} else {
  const PUBLIC_DIR = join(DIST_DIR, 'public');
  const NOT_FOUND_CONTENT =
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Not Found</title></head><body>404 Not Found</body></html>';

  mkdirSync(PUBLIC_DIR);
  await Bun.file(join(PUBLIC_DIR, '404.html')).write(NOT_FOUND_CONTENT);
  await Bun.file(join(PUBLIC_DIR, 'index.html')).write(NOT_FOUND_CONTENT);
}

console.info(Bun.color('green', 'ansi'), 'Build artifacts successfully prepared.');
