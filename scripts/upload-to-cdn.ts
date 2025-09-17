import { s3, S3_ENABLED, NUXT_DIR } from './common';

const NUXT_DIR_PREFIX = `${NUXT_DIR}/`;

if (!S3_ENABLED) {
  console.warn(
    Bun.color('yellow', 'ansi'),
    'S3 Credentials is not provided. Build artifacts not going to be uploaded to CDN.'
  );
  process.exit(0);
}

const cwd = `${import.meta.dir}/../apps/web/.output`;
const glob = new Bun.Glob('./public/**/*');
const existMap = <Record<string, boolean>>{};
const existing = await s3.list({ prefix: NUXT_DIR_PREFIX });

(existing.contents ??= []).reduce((acc, { key }) => {
  if (!key.includes(NUXT_DIR_PREFIX)) return acc;
  acc[key] = true;
  return acc;
}, existMap);

for await (const filePath of glob.scan({ cwd, absolute: true })) {
  const key = filePath.replaceAll('\\', '/').replace(/^.*\/public\//, '');
  const file = Bun.file(filePath);
  const isExist = existMap[key];

  if (isExist) {
    existMap[key] = false;
  } else {
    console.info('Uploading static asset:', key);
    await s3.file(key).write(file, { acl: 'public-read', type: file.type });
  }
}

const removalPromise = Object.entries(existMap).map(async ([key, value]) => {
  if (!value) return;
  console.info('Removing unused asset:', key);
  await s3.file(key).delete();
});

await Promise.all(removalPromise);

console.info(Bun.color('green', 'ansi'), 'Static assets uploaded successfully');

export {};
