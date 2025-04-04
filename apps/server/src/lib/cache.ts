const DEFAULT_TTL = 60 * 60 * 24 * 1000;

type Primitive = string | number | symbol;

export const createCache = () => ({
  data: new Map(),
  timers: new Map(),
  set(k: Primitive, v: any, ttl = DEFAULT_TTL) {
    if (this.timers.has(k)) clearTimeout(this.timers.get(k));
    const timer = setTimeout(() => this.delete(k), ttl);
    this.timers.set(k, timer);
    this.data.set(k, v);
  },
  get<T = any>(k: Primitive) {
    return this.data.get(k) as T;
  },
  has(k: Primitive) {
    return this.data.has(k);
  },
  delete(k: Primitive) {
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

export default createCache();
