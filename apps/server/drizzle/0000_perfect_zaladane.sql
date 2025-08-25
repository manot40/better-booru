CREATE TYPE "public"."RATING" AS ENUM('g', 's', 'q', 'e');--> statement-breakpoint
CREATE TABLE "posts" (
	"id" integer PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"score" integer,
	"source" text,
	"rating" "RATING" NOT NULL,
	"tag_ids" integer[],
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
	"created_at" date DEFAULT now() NOT NULL,
	CONSTRAINT "posts_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" integer NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "idx_posts_tag_ids" ON "posts" USING gin ("tag_ids");