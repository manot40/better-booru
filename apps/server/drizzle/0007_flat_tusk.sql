CREATE TABLE "posts_images" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"loc" text NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"orphaned" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_images_by_type" UNIQUE("post_id","type")
);
--> statement-breakpoint
ALTER TABLE "posts_images" ADD CONSTRAINT "posts_images_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;