import path from 'node:path';
import { existsSync } from 'node:fs';
import { defineConfig } from '@hey-api/openapi-ts';

const CWD = import.meta.dirname;

const inputParent = path.join(CWD, '../docs/swagger.json');
const inputCWD = path.join(CWD, 'docs/swagger.json');
const input = existsSync(inputCWD) ? inputCWD : inputParent;

export default defineConfig({
  input,
  output: path.join(CWD, './app/api'),
  plugins: ['@hey-api/client-ofetch'],
});
