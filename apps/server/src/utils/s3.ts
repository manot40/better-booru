export const S3_ENABLED = Boolean(
  Bun.env.S3_ACCESS_KEY_ID && Bun.env.S3_SECRET_ACCESS_KEY && Bun.env.S3_BUCKET
);

export const s3 = new Bun.S3Client();
