import type { Database as BunDatabase } from 'bun:sqlite';

import * as schema from './schema';

import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';

type Database = BunSQLiteDatabase<typeof schema> & { $client: BunDatabase; enabled: boolean };

const DB_PATH = Bun.env.DB_FILE_PATH ?? ':memory:';
const db = <Database>drizzle(DB_PATH, { schema });
db.enabled = !!Bun.env.DB_FILE_PATH;

export { db, schema };
