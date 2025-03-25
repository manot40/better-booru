import { drizzle } from 'drizzle-orm/bun-sqlite';

import * as schema from './schema';

export { schema };
export const db = drizzle('.data/db.sqlite3', { schema });
