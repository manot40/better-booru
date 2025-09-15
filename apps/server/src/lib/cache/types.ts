export interface CacheStore<T = any, K extends Key = Key> {
  get(k: K): T | undefined;
  getAll(): T[];
  has(k: K): boolean;
  set(k: K, v: T, ttl?: number): void;
  clear(): void;
  delete(k: K): boolean | number;
}

export type Key = string | number | symbol;
