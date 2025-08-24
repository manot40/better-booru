import type { CacheStore } from './types';

import { Database, type Statement } from 'bun:sqlite';

type DBResult = {
  key: string;
  ttl: number | null;
  value: string;
};

export class SQLiteStore implements CacheStore<string, string> {
  private db: Database;

  private checkStmt: Statement<1, [string]>;
  private queryStmt: Statement<DBResult, [string]>;
  private upsertStmt: Statement<DBResult, [string, string, number | null]>;
  private deleteStmt: Statement<DBResult, [string]>;

  constructor(dbFilePath = ':memory:') {
    const db = new Database(dbFilePath, { create: true });

    db.run("PRAGMA journal_mode = 'wal';");
    db.run(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        expires INTEGER
        
    );`);

    this.db = db;
    this.checkStmt = db.query<1, [string]>('SELECT 1 FROM cache WHERE key = ?;');
    this.queryStmt = db.query<DBResult, [string]>('SELECT * FROM cache WHERE key = ?;');
    this.upsertStmt = db.query<DBResult, [string, string, number | null]>(
      'INSERT OR REPLACE INTO cache (key, value, expires) VALUES (?1, ?2, ?3);'
    );
    this.deleteStmt = db.query<DBResult, [string]>('DELETE FROM cache WHERE key = ?;');
  }

  get(k: string): string | undefined {
    const result = this.queryStmt.get(k.toString());
    if (!result) return;

    const isExpired = result.ttl && result.ttl < Math.round(Date.now() / 1000);
    return isExpired ? undefined : result.value;
  }

  set(k: string, v: string, ttl = null as number | null): void {
    const value = Array.isArray(v) || typeof v == 'object' ? JSON.stringify(v) : `${v}`;
    const expires = ttl ? Math.round(Date.now() / 1000 + ttl) : null;
    this.upsertStmt.run(k, value, expires);
  }

  has(k: string): boolean {
    return !!this.checkStmt.get(k);
  }

  clear(): void {
    this.db.run('DELETE FROM cache;');
  }

  delete(k: string): number {
    return this.deleteStmt.run(k).changes;
  }
}

export default SQLiteStore;
