import { join } from 'node:path';
import { cpSync } from 'node:fs';

const DIST_DIR = join(process.cwd(), 'dist');
const MOD_PATH = join(process.cwd(), 'node_modules/.bun');

/** Copy sharp binaires */
const sharpGlob = new Bun.Glob('sharp@*/node_modules/@img/sharp-*');
for await (const mod of sharpGlob.scan({ cwd: MOD_PATH, onlyFiles: false, followSymlinks: true })) {
  const pkg = mod.split(/(\\|\/)/).pop()!;
  const src = join(MOD_PATH, mod);
  const dest = join(DIST_DIR, 'node_modules/@img', pkg);
  cpSync(src, dest, { recursive: true, dereference: true });
}

console.info(Bun.color('green', 'ansi'), 'Necessary binaries prepared.');
