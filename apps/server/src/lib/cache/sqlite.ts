import type { CacheStore } from './types';

import MemoryStore from './memory';

import { Database, type Statement } from 'bun:sqlite';

type DBResult = {
  key: string;
  value: string;
  expires: number | null;
};

export class SQLiteStore implements CacheStore<string, string> {
  private db: Database;
  private op: StatementMap;

  private memcache: MemoryStore<DBResult> | undefined;
  private needUpdate = false;

  constructor(dbFilePath = ':memory:') {
    const db = (this.db = new Database(dbFilePath, { create: true }));

    db.run("PRAGMA journal_mode = 'wal'");
    db.run(`
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value TEXT,
  expires INTEGER
)`);

    if (dbFilePath !== ':memory:') this.memcache = new MemoryStore();

    this.op = createStatements(db);

    const cacheToPersist = () => {
      if (!this.memcache || !this.needUpdate) return;

      const data = this.memcache.getEntries().map(([, v]) => v);
      const deleteKeys = data.map((row) => row.key);
      const insertData = this.db.transaction((data: DBResult[]) => {
        const result = data.map((row) => this.op.upsert.run(row.key, row.value, row.expires));
        return result.reduce((acc, cur) => acc + cur.changes, 0);
      });

      insertData(data);
      deleteKeys.forEach((key) => this.memcache?.delete(key));
      this.needUpdate = false;
    };

    setInterval(cacheToPersist, 60 * 1 * 1000);
  }

  get(k: string): string | undefined {
    const result = this.memcache?.get(k) || this.op.query.get(k);
    if (!result) return;

    const isExpired = result.expires ? result.expires < Math.round(Date.now() / 1000) : false;
    if (isExpired) this.delete(k);
    else return result.value;
  }

  getEntries(): [string, string][] {
    const fromMemory = this.memcache
      ?.getEntries()
      .map<[string, string]>(([, value]) => [value.key, value.value]);
    const fromPersist = this.op.getAll.all().map((row) => [row.key, row.value]);

    const entries = [...fromPersist, ...(fromMemory || [])]
      .reduce((acc, [key, value]) => {
        acc.set(key, value);
        return acc;
      }, new Map<string, string>())
      .entries();

    return Array.from(entries);
  }

  set(k: string, v: string, ttl = null as number | null): void {
    const value = Array.isArray(v) || typeof v == 'object' ? JSON.stringify(v) : `${v}`;
    const expires = ttl ? Math.round(Date.now() / 1000 + ttl) : null;

    if (this.memcache) this.memcache.set(k, { key: k, value, expires });
    else this.op.upsert.run(k, value, expires);

    this.needUpdate = true;
  }

  has(k: string): boolean {
    return !!(this.memcache?.has(k) || this.op.check.get(k));
  }

  clear(): void {
    this.db.run('DELETE FROM cache;');
    this.memcache?.clear();
  }

  delete(k: string): number {
    this.memcache?.delete(k);
    return this.op.delete.run(k).changes;
  }
}

const createStatements = (db: Database): StatementMap => ({
  check: db.prepare<1, [string]>('SELECT 1 FROM cache WHERE key = ?'),
  query: db.prepare<DBResult, [string]>('SELECT * FROM cache WHERE key = ?'),
  upsert: db.prepare<DBResult, [string, string, number | null]>(
    'INSERT OR REPLACE INTO cache (key, value, expires) VALUES (?1, ?2, ?3)'
  ),
  delete: db.prepare<DBResult, [string]>('DELETE FROM cache WHERE key = ?'),
  getAll: db.prepare<DBResult, []>('SELECT * FROM cache'),
});

type StatementMap = {
  check: Statement<1, [string]>;
  query: Statement<DBResult, [string]>;
  upsert: Statement<DBResult, [string, string, number | null]>;
  delete: Statement<DBResult, [string]>;
  getAll: Statement<DBResult, []>;
};

export default SQLiteStore;
