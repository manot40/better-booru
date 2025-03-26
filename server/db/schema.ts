import { relations } from 'drizzle-orm';
import { sqliteTable, primaryKey, int, text, blob, index } from 'drizzle-orm/sqlite-core';

const autoDt = () =>
  int({ mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date());

export type DanbooruTags = (typeof tagsTable)['$inferSelect'];
export const tagsTable = sqliteTable('tags', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().unique().notNull(),
  category: int().notNull(),
});
export const tagsRelations = relations(tagsTable, ({ many }) => ({
  artist: many(postTable),
  metaTags: many(metaTags),
  generalTags: many(generalTags),
  characterTags: many(characterTags),
}));

export type DBPostData = (typeof postTable)['$inferSelect'];
export const postTable = sqliteTable('posts', {
  id: int().primaryKey({ autoIncrement: true }),
  hash: text().unique().notNull(),
  score: int(),
  source: text(),
  rating: text({ enum: ['g', 's', 'q', 'e'] }).notNull(),
  artist_id: int()
    .notNull()
    .references(() => tagsTable.id, { onDelete: 'cascade' }),

  preview_ext: text(),
  preview_width: int(),
  preview_height: int(),
  sample_ext: text(),
  sample_width: int(),
  sample_height: int(),
  width: int().notNull(),
  height: int().notNull(),
  file_ext: text().notNull(),
  file_size: int().notNull(),

  pixiv_id: int(),
  parent_id: int(),
  uploader_id: int().notNull(),
  has_notes: int({ mode: 'boolean' }).notNull().default(false),
  has_children: int({ mode: 'boolean' }).notNull().default(false),
  created_at: autoDt(),
});
export const postRelations = relations(postTable, ({ one, many }) => ({
  artist: one(tagsTable, { fields: [postTable.artist_id], references: [tagsTable.id] }),
  postGeneralTags: many(generalTags),
  postCharacterTags: many(characterTags),
  postCopyrightTags: many(metaTags),
}));

export const [metaTags, metaTagsRelations] = generatManyToManyTags('meta');
export const [generalTags, generalTagsRelations] = generatManyToManyTags('general');
export const [characterTags, characterTagsRelations] = generatManyToManyTags('character');

export const errorOp = sqliteTable('errored_operations', {
  id: int().primaryKey({ autoIncrement: true }),
  data: blob({ mode: 'json' }).notNull(),
  trace: text(),
  last_retry: autoDt(),
  created_at: autoDt(),
});

function generatManyToManyTags<T extends string>(key: T) {
  const table = sqliteTable(
    `posts_with_${key}_tags`,
    {
      post_id: int()
        .notNull()
        .references(() => postTable.id, { onDelete: 'cascade' }),
      tag_id: int()
        .notNull()
        .references(() => tagsTable.id, { onDelete: 'cascade' }),
    },
    (t) => [primaryKey({ columns: [t.post_id, t.tag_id] }), index(`idx_pwt_${key}_tag_id`).on(t.tag_id)]
  );
  const tableRelations = relations(table, ({ one }) => ({
    post: one(postTable, { fields: [table.post_id], references: [postTable.id] }),
    tag: one(tagsTable, { fields: [table.tag_id], references: [tagsTable.id] }),
  }));

  return [table, tableRelations] as const;
}
