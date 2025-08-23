import type { Sql } from 'postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PostgresJsQueryResultHKT, PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import * as schema from './schema';
import { drizzle } from 'drizzle-orm/postgres-js';

const DB_URL = Bun.env.DATABASE_URL || 'noop';

const db = <Database>drizzle(DB_URL, { schema });
db.enabled = !!DB_URL || DB_URL !== 'noop';

export { db, schema };
export type Database = PostgresJsDatabase<typeof schema> & { $client: Sql<{}>; enabled: boolean };
export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
