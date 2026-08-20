DO $$ BEGIN
    CREATE TYPE "RATING" AS ENUM ('g', 's', 'q', 'e');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "posts" (
	"id" integer PRIMARY KEY NOT NULL,
	"lqip" bytea,
	"hash" text NOT NULL,
	"score" integer,
	"source" text,
	"rating" "RATING" NOT NULL,
	"tag_ids" integer[] NOT NULL,
	"meta_ids" integer[] NOT NULL,
	"preview_ext" text,
	"preview_width" integer,
	"preview_height" integer,
	"sample_ext" text,
	"sample_width" integer,
	"sample_height" integer,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"file_ext" text NOT NULL,
	"file_size" integer NOT NULL,
	"pixiv_id" integer,
	"parent_id" integer,
	"uploader_id" integer NOT NULL,
	"has_notes" boolean DEFAULT false NOT NULL,
	"has_children" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_hash_unique" UNIQUE("hash")
);

CREATE TABLE IF NOT EXISTS "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" smallint NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "posts_images" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
	"loc" text NOT NULL,
	"type" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"orphaned" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_images_by_type" UNIQUE("post_id", "type")
);

CREATE INDEX IF NOT EXISTS "idx_score" ON "posts" USING btree ("score");
CREATE INDEX IF NOT EXISTS "idx_posts_tag_ids" ON "posts" USING gin ("tag_ids");
CREATE INDEX IF NOT EXISTS "idx_posts_meta_ids" ON "posts" USING gin ("meta_ids");
