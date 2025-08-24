import { boolean, date, index, integer, pgEnum, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const ratingEnum = pgEnum('RATING', ['g', 's', 'q', 'e']);

export type DBPostData = (typeof postTable)['$inferSelect'];
export const postTable = pgTable(
  'posts',
  {
    id: integer().primaryKey(),
    hash: text().unique().notNull(),
    score: integer(),
    source: text(),
    rating: ratingEnum().notNull(),
    tag_ids: integer().array(),

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
    created_at: date().notNull().defaultNow(),
  },
  (table) => [index('idx_posts_tag_ids').using('gin', table.tag_ids)]
);

export type DBTagData = (typeof tagsTable)['$inferSelect'];
export const tagsTable = pgTable('tags', {
  id: serial().primaryKey(),
  name: text().unique().notNull(),
  category: integer().notNull(),
});
