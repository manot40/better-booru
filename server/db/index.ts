import type { Database as BunDatabase } from 'bun:sqlite';

import * as schema from './schema';

import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { withReplicas, type SQLiteWithReplicas } from 'drizzle-orm/sqlite-core';

type Database = SQLiteWithReplicas<
  BunSQLiteDatabase<typeof schema> & { $client: BunDatabase; enabled: boolean }
>;

const DB_PATH = Bun.env.DB_FILE_PATH ?? ':memory:';

const primary = drizzle(DB_PATH, { schema });
const replica1 = drizzle(DB_PATH, { schema });
const replica2 = drizzle(DB_PATH, { schema });

const db = <Database>withReplicas(primary, [replica1, replica2]);
db.enabled = !!Bun.env.DB_FILE_PATH;

export { db, schema };
