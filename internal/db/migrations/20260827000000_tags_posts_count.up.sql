ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "posts_count" bigint NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "idx_tags_posts_count" ON "tags" USING btree ("posts_count");
