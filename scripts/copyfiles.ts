import { join } from 'node:path';
import { cpSync, existsSync, rmSync } from 'node:fs';

if (existsSync('./dist')) rmSync('./dist', { recursive: true, force: true });

cpSync('./apps/server/dist', './dist', { recursive: true });
cpSync('./apps/web/.output/public', './dist/public', { recursive: true });

const SHARP_MOD = 'node_modules/@img';
cpSync(join(process.cwd(), SHARP_MOD), join(process.cwd(), 'dist', SHARP_MOD), { recursive: true });

console.info('Output Files Copied.');
