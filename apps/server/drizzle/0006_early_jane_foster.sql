ALTER TABLE "posts" RENAME COLUMN "author_ids" TO "meta_ids";--> statement-breakpoint
DROP INDEX "idx_posts_author_ids";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "meta_ids" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "tag_ids" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_posts_meta_ids" ON "posts" USING gin ("meta_ids");
