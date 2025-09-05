import { db } from 'db';

import { queryPosts } from 'lib/query/post';

declare var self: Worker;

self.addEventListener('message', async (event) => {
  const evData = <WorkerEventPayload>parsePayload(event);

  if (evData.type === 'QueryPosts') self.postMessage(await queryPosts(evData.payload));

  await db.$client.end();
});

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
