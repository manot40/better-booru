import { relations } from 'drizzle-orm';
import { sqliteTable, int, text, index } from 'drizzle-orm/sqlite-core';

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
  post: many(postTable),
  metaTags: many(metaTags),
  commonTags: many(commonTags),
  uncommonTags: many(uncommonTags),
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
  postCommonTags: many(commonTags),
  postUncommonTags: many(commonTags),
  postCopyrightTags: many(metaTags),
  postCharacterTags: many(characterTags),
}));

export const [metaTags, metaTagsRelations] = generatManyToManyTags('meta');
export const [commonTags, commonTagsRelations] = generatManyToManyTags('common');
export const [uncommonTags, uncommonTagsRelations] = generatManyToManyTags('uncommon');
export const [characterTags, characterTagsRelations] = generatManyToManyTags('character');

export type PostRelations = ReturnType<typeof generatManyToManyTags>[0];
function generatManyToManyTags<T extends string>(key: T) {
  const table = sqliteTable(
    `posts_with_${key}_tags`,
    {
      post_id: int()
        .notNull()
        .references(() => postTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
      tag_id: int()
        .notNull()
        .references(() => tagsTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    },
    (t) => [index(`idx_pwt_${key}_post_id`).on(t.post_id), index(`idx_pwt_${key}_tag_id`).on(t.tag_id)]
  );
  const tableRelations = relations(table, ({ one }) => ({
    post: one(postTable, { fields: [table.post_id], references: [postTable.id] }),
    tag: one(tagsTable, { fields: [table.tag_id], references: [tagsTable.id] }),
  }));

  return [table, tableRelations] as const;
}
