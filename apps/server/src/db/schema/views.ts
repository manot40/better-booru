import { tagsTable, commonTags, uncommonTags, metaTags, type PostRelations } from './base';

import { eq, sql, getTableColumns } from 'drizzle-orm';
import { sqliteView, type QueryBuilder } from 'drizzle-orm/sqlite-core';

export const expensiveMetaTags = sqliteView('expensive_meta_tags').as((qb) =>
  generateQuery(qb, metaTags, 200000)
);

export const expensiveUncommonTags = sqliteView('expensive_uncommon_tags').as((qb) =>
  generateQuery(qb, uncommonTags, 300000)
);

export const expensiveCommonTags = sqliteView('expensive_common_tags').as((qb) =>
  generateQuery(qb, commonTags, 500000)
);

function generateQuery(qb: QueryBuilder, table: PostRelations, limit: number) {
  const tagPostCounts = qb.$with('tags_post_counts').as(
    qb
      .select({ tag_id: table.tag_id, count: sql<number>`COUNT(ROWID)`.as('post_count') })
      .from(table)
      .groupBy(table.tag_id)
      .having(sql`COUNT(ROWID) > ${limit}`)
  );
  return qb
    .with(tagPostCounts)
    .select({ ...getTableColumns(tagsTable), count: tagPostCounts.count })
    .from(tagsTable)
    .innerJoin(tagPostCounts, eq(tagsTable.id, tagPostCounts.tag_id));
}
