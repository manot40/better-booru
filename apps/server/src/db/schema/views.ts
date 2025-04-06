import { tagsTable, commonTags, uncommonTags } from './base';

import { sql } from 'drizzle-orm';
import { sqliteView } from 'drizzle-orm/sqlite-core';

const check = <C extends typeof commonTags | typeof uncommonTags>(column: C, limit: number) =>
  sql<number>`SELECT CASE WHEN COUNT(*) > ${limit} THEN 1 ELSE 0 END as stats FROM (SELECT 1 FROM ${column} WHERE ${column.tag_id} = ${tagsTable.id} LIMIT ${limit + 1})`;

export const expensiveCommonTags = sqliteView('expensive_common_tags').as((qb) =>
  qb
    .select()
    .from(tagsTable)
    .where(sql`1 = (${check(commonTags, 500000)})`)
);

export const expensiveUncommonTags = sqliteView('expensive_uncommon_tags').as((qb) =>
  qb
    .select()
    .from(tagsTable)
    .where(sql`1 = (${check(uncommonTags, 300000)})`)
);
