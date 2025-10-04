import type { SQL } from 'bun';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { BunSQLQueryResultHKT as ResultHKT, BunSQLDatabase as DB } from 'drizzle-orm/bun-sql';

import * as schema from './schema';
import { drizzle } from 'drizzle-orm/bun-sql';

const DB_URL = Bun.env.DATABASE_URL || 'noop';

const db = <Database>drizzle(DB_URL, { schema });
db.enabled = !!DB_URL || DB_URL !== 'noop';

export { db, schema, schema as $s };
export type Database = DB<typeof schema> & { $client: SQL; enabled: boolean };
export type Transaction = PgTransaction<ResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;
