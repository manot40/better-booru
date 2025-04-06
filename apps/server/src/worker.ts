import { queryPosts } from 'lib/query/post';
import { queryExpensiveTags } from 'lib/query/tags';

declare var self: Worker;

self.addEventListener('message', async (event) => {
  const evData = <WorkerEventPayload>parsePayload(event);
  if (evData.type === 'QueryPosts') self.postMessage(queryPosts(evData.payload, true));
  if (evData.type === 'QueryExpensiveTags') self.postMessage(queryExpensiveTags(evData.payload));
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
