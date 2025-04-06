export const WORKER_PATH = Bun.pathToFileURL(
  `${process.cwd()}${import.meta.dir.includes('src') ? '/src' : ''}/worker`
);
