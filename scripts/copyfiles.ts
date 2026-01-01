import { join, basename } from 'node:path';
import { cpSync, existsSync, rmSync } from 'node:fs';

import { S3_ENABLED, NUXT_DIR } from './common';

const DIST_DIR = join(process.cwd(), 'dist');
const MOD_PATH = join(process.cwd(), 'node_modules');
const ARTIFACTS = 'apps/web/.output/public/**/*';

if (existsSync(DIST_DIR)) {
  rmSync(DIST_DIR, { recursive: true, force: true });
}

/** Copy server build files */
cpSync('./apps/server/dist', DIST_DIR, { recursive: true });
const sharpGlob = new Bun.Glob('@img/sharp-*');
for await (const mod of sharpGlob.scan({ cwd: MOD_PATH, onlyFiles: false, followSymlinks: true })) {
  const pkg = mod.split('/').pop()!;
  const src = join(MOD_PATH, mod);
  const dest = join(DIST_DIR, 'node_modules', pkg);
  cpSync(src, dest, { recursive: true, dereference: true });
}

/** Copy frontend build files */
const assetsGlob = new Bun.Glob(join(process.cwd(), ARTIFACTS));
for await (const filePath of assetsGlob.scan()) {
  const fileUrl = Bun.pathToFileURL(filePath).toString();
  const isNuxtFile = fileUrl.includes(`${NUXT_DIR}/`);

  /**
   * Nuxt static assets will be uploaded to CDN (if enabled),
   * so they are not copied to the dist directory.
   */
  if (S3_ENABLED && isNuxtFile) continue;

  let destination: string;
  if (isNuxtFile) {
    const fileName = fileUrl.replace(/.*\/.output\//g, '');
    destination = join(DIST_DIR, fileName);
  } else {
    const fileName = basename(filePath);
    destination = join(DIST_DIR, 'public', fileName);
  }

  cpSync(filePath, destination, { recursive: true });
}

console.info(Bun.color('green', 'ansi'), 'Build artifacts successfully prepared.');
