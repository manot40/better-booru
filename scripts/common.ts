const S3_ENABLED = Boolean(
  (Bun.env.S3_PUBLIC_ENDPOINT || Bun.env.S3_ENDPOINT) &&
    Bun.env.S3_SECRET_ACCESS_KEY &&
    Bun.env.S3_ACCESS_KEY_ID &&
    Bun.env.S3_BUCKET
);

const NUXT_DIR = 'web_assets';

const s3 = new Bun.S3Client();

export { s3, NUXT_DIR, S3_ENABLED };
