import { waitForWorker, WORKER_PATH } from 'utils/worker';

const tags: string[] = [];

const createWorker = (payload: 'common' | 'uncommon') =>
  waitForWorker<string[]>(WORKER_PATH, { type: 'QueryExpensiveTags', payload });

export function expensiveTags() {
  Promise.all([createWorker('common'), createWorker('uncommon')]).then((result) =>
    tags.push(...result[0], ...result[1])
  );
  return tags;
}
