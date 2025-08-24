import { Database, type Statement } from 'bun:sqlite';

export type Key = string | number;

export interface CacheStore<T = any, K extends Key = Key> {
  get(k: K): T | undefined;
  has(k: K): boolean;
  set(k: K, v: T, ttl?: number): void;
  clear(): void;
  delete(k: K): boolean;
}

type DBResult<T = any> = {
  key: string;
  ttl: number | null;
  value: T;
};

export class SQLiteStore<T = any, K extends Key = Key> implements CacheStore {
  private db: Database;

  private queryStmt: Statement<DBResult<T>, any>;
  private upsertStmt: Statement<DBResult<T>, [K, string, number | null]>;
  private deleteStmt: Statement<DBResult<T>, [K]>;

  constructor(dbFilePath = '.data/cache.db') {
    this.db = new Database(dbFilePath);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        ttl INTEGER,
        value TEXT
        
    );`);
    this.db.run("PRAGMA journal_mode = 'wal';");

    this.queryStmt = this.db.query<DBResult<T>, any>('SELECT * FROM cache WHERE key = ?;');
    this.upsertStmt = this.db.query<DBResult<T>, [K, string, number | null]>(
      'INSERT OR REPLACE INTO cache (key, value, ttl) VALUES (?1, ?2, ?3);'
    );
    this.deleteStmt = this.db.query<DBResult<T>, [K]>('DELETE FROM cache WHERE key = ?;');
  }

  get(k: K): T | undefined {
    return this.queryStmt.get(k.toString())?.value || undefined;
  }

  set(k: K, v: T, ttl = null as number | null): void {
    const value = Array.isArray(v) || typeof v == 'object' ? JSON.stringify(v) : `${v}`;
    this.upsertStmt.run(k.toString() as K, value, ttl);
  }

  has(k: K): boolean {
    return !!this.db.query<1, string>('SELECT 1 FROM cache WHERE key = ?;').get(k.toString());
  }

  clear(): void {
    this.db.run('DELETE FROM cache;');
  }

  delete(k: Key): boolean {
    return !!this.deleteStmt.run(k.toString() as K).changes;
  }
}
