import { MaybePromise } from 'types/util';

export interface CacheStore<T = any, K extends Key = Key> {
  get(k: K): MaybePromise<T | undefined>;
  has(k: K): MaybePromise<boolean>;
  set(k: K, v: T, ttl?: number): void;
  pop(): MaybePromise<[K, T] | undefined>;
  clear(): void;
  size(): MaybePromise<number>;
  delete(k: K): MaybePromise<boolean | number>;
  getEntries(): MaybePromise<[K, T][]>;
}

export type Key = string | number | symbol;
