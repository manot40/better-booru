import type { CacheStore } from './types';

class RedisStore implements CacheStore<string, string> {
  private redis: Bun.RedisClient;
  private connected = false;
  private queueKey: string;

  constructor(
    private cacheKey: string,
    redisURL?: string
  ) {
    this.queueKey = `queue:${cacheKey}`;
    this.redis = new Bun.RedisClient(redisURL);
    this.redis.connect().then(() => {
      this.connected = true;
    });
  }

  private async waitConnection(count = 0): Promise<void> {
    await new Promise((r) => setTimeout(r, 1000));

    if (this.connected) return;

    if (count < 3) return this.waitConnection(count + 1);
    else throw new Error('Redis Connection Failed');
  }

  async has(k: string): Promise<boolean> {
    if (!this.connected) await this.waitConnection();
    const cmd = await this.redis.send('HEXISTS', [this.cacheKey, k]);
    return cmd?.toString().trim() === '1';
  }

  async get(k: string): Promise<string | undefined> {
    if (!this.connected) await this.waitConnection();
    const [item] = await this.redis.hmget(this.cacheKey, [k]);
    return item ?? undefined;
  }

  async getEntries(): Promise<[string, string][]> {
    if (!this.connected) await this.waitConnection();
    const entries = await this.redis.hgetall(this.cacheKey);

    if (!entries) return [];
    return Object.entries(entries);
  }

  async set(k: string, v: string, ttl?: number): Promise<void> {
    if (!this.connected) await this.waitConnection();

    const exist = await this.has(k);
    await this.redis.send('HSET', [this.cacheKey, k, v]).then(() => {
      if (!exist) this.redis.rpush(this.queueKey, k);
    });

    if (ttl) this.redis.send('HEXPIRE', [this.cacheKey, ttl.toString(), 'FIELDS', '1', k]);
  }

  async pop(): Promise<[string, string] | undefined> {
    if (!this.connected) await this.waitConnection();
    const key = await this.redis.lpop(this.queueKey);

    if (key) {
      const value = await this.redis.hget(this.cacheKey, key);
      this.redis.send('HDEL', [this.cacheKey, key]);
      return [key, value ?? ''];
    }
  }

  async delete(k: string): Promise<1 | 0> {
    if (!this.connected) await this.waitConnection();
    const cmd = await this.redis.send('HDEL', [this.cacheKey, k]);
    return cmd?.toString().trim() === '1' ? 1 : 0;
  }

  async clear(): Promise<void> {
    if (!this.connected) await this.waitConnection();
    await this.redis.send('DEL', [this.cacheKey]);
  }
}

export default RedisStore;
