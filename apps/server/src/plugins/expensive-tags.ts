import type { DanbooruTags } from 'db/schema';

import { waitForWorker, WORKER_PATH } from 'utils/worker';

const tags: DanbooruTags[] = [];

const createWorker = (payload: 'meta' | 'common' | 'uncommon') =>
  waitForWorker<DanbooruTags[]>(WORKER_PATH, { type: 'QueryExpensiveTags', payload });

export function expensiveTags() {
  Promise.all([createWorker('meta'), createWorker('common'), createWorker('uncommon')]).then((result) => {
    const deduped = [...result[0], ...result[1], ...result[1]]
      .reduce((acc, next) => {
        if (acc.has(next.name)) return acc;
        return acc.set(next.name, next);
      }, new Map<string, DanbooruTags>())
      .values();
    tags.push(...Array.from(deduped));
  });
  return tags;
}
