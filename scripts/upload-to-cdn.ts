const S3_ENABLED = Boolean(
  (Bun.env.S3_PUBLIC_ENDPOINT || Bun.env.S3_ENDPOINT) &&
    Bun.env.S3_SECRET_ACCESS_KEY &&
    Bun.env.S3_ACCESS_KEY_ID &&
    Bun.env.S3_BUCKET
);

if (!S3_ENABLED) {
  console.warn('S3 Credentials is not provided, assets would not be uploaded to CDN.');
  process.exit(0);
}

const s3 = new Bun.S3Client();
const cwd = `${import.meta.dir}/../apps/web/.output`;
const glob = new Bun.Glob('./public/**/*');
const existMap = <Record<string, boolean>>{};
const existing = await s3.list({ prefix: '_nuxt/' });

(existing.contents ??= []).reduce((acc, { key }) => {
  if (!key.includes('_nuxt/')) return acc;
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
  console.info('Deleting stale asset:', key);
  await s3.file(key).delete();
});

await Promise.all(removalPromise);

console.info('Static assets uploaded successfully');

export {};
