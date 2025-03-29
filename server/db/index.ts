import type { Database } from 'bun:sqlite';

import * as schema from './schema';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';

export { schema };
export let db: BunSQLiteDatabase<typeof schema> & { $client: Database };

Bun.file(`${process.cwd()}/.data/db.sqlite3`)
  .exists()
  .then((exists) => {
    if (exists) db = drizzle('.data/db.sqlite3', { schema });
  });
