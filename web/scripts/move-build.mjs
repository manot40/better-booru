import { join } from 'node:path';
import { cpSync } from 'node:fs';

const CWD = import.meta.dirname;
const from = join(CWD, '../.output/public');
const to = join(CWD, '../../internal/static/public');

cpSync(from, to, { recursive: true });
