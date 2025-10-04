import type { CacheStore } from './types';

import { Database, type Statement } from 'bun:sqlite';

export type CacheResult = {
  key: string;
  value: string;
  expires: number | null;
};

export class SQLiteStore implements CacheStore<string, string> {
  public db: Database;
  private op: StatementMap;

  constructor(dbFilePath = ':memory:') {
    this.db = new Database(dbFilePath, { create: true });

    this.db.run("PRAGMA journal_mode = 'wal'");
    // prettier-ignore
    this.db.run(
    'CREATE TABLE IF NOT EXISTS cache (' +
      'key TEXT PRIMARY KEY,' +
      'value TEXT,' +
      'expires INTEGER' +
    ')');

    this.vacuum();
    this.op = createStatements(this.db);
  }

  private isExpired(result: CacheResult): boolean {
    return result.expires ? result.expires < Math.round(Date.now() / 1000) : false;
  }

  has(k: string): boolean {
    return !!this.op.check.get(k);
  }

  get(k: string): string | undefined {
    const result = this.op.query.get(k);
    if (result) {
      if (this.isExpired(result)) this.delete(k);
      else return result.value;
    }
  }

  getEntries(): [string, string][] {
    return this.op.getAll.all().map((row) => <[string, string]>[row.key, row.value]);
  }

  set(k: string, v: string, ttl?: number, replace = true): void {
    const value = Array.isArray(v) || typeof v == 'object' ? JSON.stringify(v) : `${v}`;
    const expires = ttl ? Math.round(Date.now() / 1000 + ttl) : null;

    if (replace) this.op.upsert.run(k, value, expires);
    else if (!this.has(k)) this.op.insert.run(k, value, expires);
  }

  pop(): [string, string] | undefined {
    const result = this.op.pop.get();
    if (result) {
      this.delete(result.key);
      return [result.key, result.value];
    }
  }

  clear(): void {
    this.db.run('DELETE FROM cache;');
  }

  delete(k: string): number {
    return this.op.delete.run(k).changes;
  }

  vacuum(): void {
    try {
      this.db.run('VACUUM');
    } catch {}
  }
}

const createStatements = (db: Database): StatementMap => ({
  pop: db.prepare<CacheResult, []>('SELECT * FROM cache ORDER BY ROWID ASC LIMIT 1'),
  check: db.prepare<1, [string]>('SELECT 1 FROM cache WHERE key = ?'),
  query: db.prepare<CacheResult, [string]>('SELECT * FROM cache WHERE key = ?'),
  upsert: db.prepare<CacheResult, [string, string, number | null]>(
    'INSERT OR REPLACE INTO cache (key, value, expires) VALUES (?1, ?2, ?3)'
  ),
  insert: db.prepare<CacheResult, [string, string, number | null]>(
    'INSERT INTO cache (key, value, expires) VALUES (?1, ?2, ?3)'
  ),
  delete: db.prepare<CacheResult, [string]>('DELETE FROM cache WHERE key = ?'),
  getAll: db.prepare<CacheResult, []>('SELECT * FROM cache ORDER BY ROWID ASC'),
});

type StatementMap = {
  pop: Statement<CacheResult, []>;
  check: Statement<1, [string]>;
  query: Statement<CacheResult, [string]>;
  upsert: Statement<CacheResult, [string, string, number | null]>;
  insert: Statement<CacheResult, [string, string, number | null]>;
  delete: Statement<CacheResult, [string]>;
  getAll: Statement<CacheResult, []>;
};

export default SQLiteStore;
