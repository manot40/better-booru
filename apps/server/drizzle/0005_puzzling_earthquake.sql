ALTER TABLE "posts" ADD COLUMN "author_ids" integer[];--> statement-breakpoint
CREATE INDEX "idx_posts_author_ids" ON "posts" USING gin ("author_ids");
