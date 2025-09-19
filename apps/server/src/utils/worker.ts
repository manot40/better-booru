import type { WorkerEventPayload } from 'types/util';

export const WORKER_PATH = Bun.pathToFileURL(
  `${process.cwd()}${import.meta.dir.includes('src') ? '/src' : ''}/worker`
);

function waitForWorker<T = unknown>(data: WorkerEventPayload<any>): Promise<WorkerResult<T>>;
function waitForWorker<T = unknown>(
  target: WorkerTarget,
  data: WorkerEventPayload<any>
): Promise<WorkerResult<T>>;
function waitForWorker<T = unknown>(
  target: WorkerTarget | WorkerEventPayload<any>,
  data?: WorkerEventPayload<any>
) {
  let worker: Worker;

  if (target instanceof Worker) {
    worker = target;
    worker.postMessage(data);
  } else if (typeof target == 'string' || target instanceof URL) {
    worker = new Worker(target, { smol: true });
    worker.postMessage(data);
  } else {
    worker = new Worker(WORKER_PATH, { smol: true });
    worker.postMessage(target);
  }

  return new Promise<WorkerResult<T>>((res) =>
    worker.addEventListener('message', (ev) => res({ ...ev.data, worker }), { once: true })
  );
}

type Result<T> = { error: string; data?: never } | { data: T; error?: never };

export { waitForWorker };
export type WorkerTarget = Worker | URL | string;
export type WorkerResult<T> = Result<T> & { worker: Worker };
