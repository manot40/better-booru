export const WORKER_PATH = Bun.pathToFileURL(
  `${process.cwd()}${import.meta.dir.includes('src') ? '/src' : ''}/worker`
);

export async function waitForWorker<T = unknown>(
  target: Worker | URL | string,
  data: WorkerEventPayload<any>
) {
  const worker = target instanceof Worker ? target : new Worker(target, { smol: true });
  worker.postMessage(data);
  return await new Promise<T>((res) =>
    worker.addEventListener('message', (ev) => (res(ev.data), worker.terminate()), { once: true })
  );
}
