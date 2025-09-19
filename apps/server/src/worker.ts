import type { Query } from 'drizzle-orm';
import type { WorkerEventPayload } from 'types/util';

import { db } from 'db';

declare var self: Worker;

self.addEventListener('message', async (event) => {
  try {
    const { op: type, payload } = <WorkerEventPayload>parsePayload(event);

    switch (type) {
      case 'DB_OPERATION': {
        if (!isQuery(payload)) {
          throw new Error('Invalid SQL Query or Parameters Provided');
        }

        const data = await db.$client.unsafe(payload.sql, payload.params);

        return db.$client.end().finally(() => self.postMessage({ data }));
      }

      default:
        throw new Error('Invalid Operation Type');
    }
  } catch (e) {
    self.postMessage({ error: (<Error>e).message });
  }
});

const isQuery = (payload: any): payload is Query => {
  return typeof payload === 'object' && 'sql' in payload && 'params' in payload;
};

function parsePayload(ev: MessageEvent<any>) {
  const data = ev.data;
  if (typeof data == 'string') {
    try {
      const result = JSON.parse(data);
      return result;
    } catch {
      return data;
    }
  } else {
    return data;
  }
}
