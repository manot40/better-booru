DROP INDEX IF EXISTS "idx_tags_posts_count";
ALTER TABLE "tags" DROP COLUMN IF EXISTS "posts_count";
