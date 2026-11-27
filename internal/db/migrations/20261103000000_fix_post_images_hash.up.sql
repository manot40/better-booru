BEGIN;
SET LOCAL statement_timeout = 0;

UPDATE "posts_images" AS pi
SET "hash" = p."hash",
    "orphaned" = true,
    "updated_at" = NOW()
FROM "posts" AS p
WHERE pi."post_id" = p."id"
  AND pi."hash" != p."hash";

COMMIT;
