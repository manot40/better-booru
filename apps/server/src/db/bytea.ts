import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer<ArrayBufferLike> }>({
  dataType: () => 'bytea' as const,
  toDriver: (value) => sql`decode(${value.toHex()}, 'hex')`,
  fromDriver(value) {
    if (value instanceof Buffer) {
      return value;
    }

    if (typeof value === 'string') {
      return Buffer.from(value.replace(/\\x/g, ''), 'hex');
    }

    throw new Error(`Cannot convert type: ${typeof value} to buffer`);
  },
});

export default bytea;
