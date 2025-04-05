import { type QueryOptions, queryPosts } from 'lib/query/post';

declare var self: Worker;

self.addEventListener('message', async (ev) => {
  const evData = <WorkerEventPayload<QueryOptions>>JSON.parse(ev.data);
  if (evData.type === 'QueryPosts') self.postMessage(queryPosts(evData.payload, true));
});
