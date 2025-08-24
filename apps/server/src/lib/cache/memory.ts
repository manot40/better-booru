import type { CacheStore, Key } from './types';

export class MemoryStore<T = any> implements CacheStore<T, Key> {
  private data = new Map<Key, T>();
  private timers = new Map<Key, NodeJS.Timeout>();

  static DEFAULT_TTL = 60 * 60 * 24;

  constructor() {}

  set(k: Key, v: T, ttl = MemoryStore.DEFAULT_TTL) {
    if (this.timers.has(k)) clearTimeout(this.timers.get(k));
    const timer = setTimeout(() => this.delete(k), ttl * 1000);
    this.timers.set(k, timer);
    this.data.set(k, v);
  }

  get(k: Key) {
    return this.data.get(k) as T;
  }

  has(k: Key) {
    return this.data.has(k);
  }

  delete(k: Key) {
    if (this.timers.has(k)) clearTimeout(this.timers.get(k));
    this.timers.delete(k);
    return this.data.delete(k);
  }

  clear() {
    this.data.clear();
    for (const v of this.timers.values()) clearTimeout(v);
    this.timers.clear();
  }
}

export default MemoryStore;
