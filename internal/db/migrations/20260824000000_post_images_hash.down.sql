BEGIN;

ALTER TABLE posts_images
  DROP COLUMN id CASCADE;

ALTER TABLE posts_images
  RENAME COLUMN hash TO id;

ALTER TABLE posts_images
  ADD CONSTRAINT posts_images_pkey PRIMARY KEY (id);

COMMIT;
