BEGIN;
SET LOCAL statement_timeout = 0;

ALTER TABLE "posts_images"
  DROP CONSTRAINT "posts_images_pkey";

ALTER TABLE "posts_images"
  RENAME COLUMN "id" TO "hash";

ALTER TABLE "posts_images"
  ADD COLUMN "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY;

CREATE INDEX IF NOT EXISTS "idx_posts_images_hash" ON "posts_images" USING btree ("hash");

COMMIT;
