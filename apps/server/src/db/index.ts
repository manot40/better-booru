import type { PgAsyncTransaction } from 'drizzle-orm/pg-core';
import type { BunSQLQueryResultHKT as ResultHKT, BunSQLSession as DB } from 'drizzle-orm/bun-sql';

import { drizzle } from 'drizzle-orm/bun-sql';
import { defineRelations } from 'drizzle-orm';

import * as schema from './schema';

const DB_URL = Bun.env.DATABASE_URL || 'noop';

export const relations = defineRelations(schema, (r) => ({
  postTable: {
    images: r.many.postImagesTable(),
  },
  postImagesTable: {
    post: r.one.postTable({
      from: r.postImagesTable.postId,
      to: r.postTable.id,
    }),
  },
}));

const db = <Database>drizzle(DB_URL, { schema, relations });
db.enabled = !!DB_URL || DB_URL !== 'noop';

export { db, schema, schema as $s };

export type Schema = typeof schema;
export type Relations = typeof relations;
export type Database = ReturnType<typeof drizzle<Schema, Relations>> & { enabled: boolean };
export type Transaction = PgAsyncTransaction<ResultHKT, Schema, Relations>;
