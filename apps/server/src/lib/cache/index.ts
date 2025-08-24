import type { CacheStore, Key } from './store';

const DEFAULT_TTL = 60 * 60 * 24 * 1000;

export const createCache = <T = any>(storage = new Map() as CacheStore<T>) => ({
  data: storage,
  timers: new Map(),
  set(k: Key, v: any, ttl = DEFAULT_TTL) {
    if (this.timers.has(k)) clearTimeout(this.timers.get(k));
    const timer = setTimeout(() => this.delete(k), ttl);
    this.timers.set(k, timer);
    this.data.set(k, v);
  },
  get(k: Key) {
    return this.data.get(k) as T;
  },
  has(k: Key) {
    return this.data.has(k);
  },
  delete(k: Key) {
    if (this.timers.has(k)) clearTimeout(this.timers.get(k));
    this.timers.delete(k);
    return this.data.delete(k);
  },
  clear() {
    this.data.clear();
    for (const v of this.timers.values()) clearTimeout(v);
    this.timers.clear();
  },
});

export { SQLiteStore } from './store';

export default createCache();
