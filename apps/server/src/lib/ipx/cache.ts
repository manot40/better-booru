import type { HTTPHeaders } from 'elysia/dist/types';

export type HeaderMeta = Pick<
  Required<HTTPHeaders>,
  'expires' | 'last-modified' | 'cache-control' | 'content-type' | 'content-length'
>;

export function prepareCache(hash: string) {
  const path = `${process.cwd()}/.cache/ipx/${hash}`;
  const file = Bun.file(Bun.pathToFileURL(path));
  const meta = Bun.file(Bun.pathToFileURL(path + '.json'));
  return [file, meta] as const;
}

export async function setCache(hash: string, data: string | Buffer<ArrayBufferLike>, meta: HeaderMeta) {
  const [cacheFile, cacheMeta] = prepareCache(hash);
  await Promise.all([cacheFile.write(data), cacheMeta.write(JSON.stringify(meta))]);
}

export async function getCache(hash: string) {
  const [cacheFile, cacheMeta] = prepareCache(hash);
  if (!(await cacheFile.exists())) return;

  const rm = async () => {
    await Promise.all([cacheFile.unlink(), cacheMeta.unlink()]);
  };

  const [data, meta] = await Promise.all([cacheFile.arrayBuffer(), cacheMeta.text()]);
  return { data, meta: <HeaderMeta>JSON.parse(meta), rm };
}
