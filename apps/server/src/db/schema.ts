import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import bytea from './bytea';
import { relations } from 'drizzle-orm';

export const ratingEnum = pgEnum('RATING', ['g', 's', 'q', 'e']);

export type DBPostData = (typeof postTable)['$inferSelect'];
export const postTable = pgTable(
  'posts',
  {
    id: integer().primaryKey(),
    lqip: bytea('lqip'),
    hash: text().unique().notNull(),
    score: integer(),
    source: text(),
    rating: ratingEnum().notNull(),
    tag_ids: integer().array().notNull(),
    meta_ids: integer().array().notNull(),

    preview_ext: text(),
    preview_width: integer(),
    preview_height: integer(),
    sample_ext: text(),
    sample_width: integer(),
    sample_height: integer(),
    width: integer().notNull(),
    height: integer().notNull(),
    file_ext: text().notNull(),
    file_size: integer().notNull(),

    pixiv_id: integer(),
    parent_id: integer(),
    uploader_id: integer().notNull(),
    has_notes: boolean().notNull().default(false),
    has_children: boolean().notNull().default(false),
    created_at: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index('idx_score').on(table.score),
    index('idx_posts_tag_ids').using('gin', table.tag_ids),
    index('idx_posts_meta_ids').using('gin', table.meta_ids),
  ]
);

export type DBTagData = (typeof tagsTable)['$inferSelect'];
export const tagsTable = pgTable('tags', {
  id: serial().primaryKey(),
  name: text().unique().notNull(),
  category: smallint().notNull(),
});

export type DBImageData = (typeof postImagesTable)['$inferSelect'];
export const postImagesTable = pgTable(
  'posts_images',
  {
    id: text().primaryKey(),
    postId: integer('post_id')
      .notNull()
      .references(() => postTable.id),
    loc: text().notNull().$type<'CDN' | 'LOCAL'>(),
    type: text().notNull().$type<'PREVIEW' | 'ORIGINAL'>(),
    path: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    orphaned: boolean().notNull().default(false),
    updatedAt: timestamp('updated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique('posts_images_by_type').on(t.postId, t.type)]
);

export const postImages = relations(postTable, ({ many }) => ({
  images: many(postImagesTable),
}));
