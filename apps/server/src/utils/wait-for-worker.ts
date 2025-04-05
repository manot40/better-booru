export async function waitForWorker<T = unknown>(file: string | URL, data: WorkerEventPayload<any>) {
  const worker = new Worker(file, { smol: true });
  worker.postMessage(JSON.stringify(data));
  return await new Promise<T>((res) =>
    worker.addEventListener('message', (ev) => (res(ev.data), worker.terminate()), { once: true })
  );
}
