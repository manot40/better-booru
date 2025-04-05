import { join } from 'node:path';
import { cpSync, existsSync, renameSync, rmSync } from 'node:fs';

if (existsSync('./dist')) rmSync('./dist', { recursive: true, force: true });

renameSync('./apps/server/dist', './dist');
renameSync('./apps/web/.output/public', './dist/public');

const SHARP_MOD = 'node_modules/@img';
const ELYSIA_JSON = 'node_modules/elysia/package.json';
cpSync(join(process.cwd(), SHARP_MOD), join(process.cwd(), 'dist', SHARP_MOD), { recursive: true });
cpSync(join(process.cwd(), ELYSIA_JSON), join(process.cwd(), 'dist', ELYSIA_JSON), { recursive: true });

console.log('Output Files Copied.');
