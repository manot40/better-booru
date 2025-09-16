export interface CacheStore<T = any, K extends Key = Key> {
  get(k: K): T | undefined;
  has(k: K): boolean;
  set(k: K, v: T, ttl?: number): void;
  clear(): void;
  delete(k: K): boolean | number;
  getEntries(): [K, T][];
}

export type Key = string | number | symbol;
