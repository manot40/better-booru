import { db, schema as $s } from 'db';

export function queryExpensiveTags(type: 'common' | 'uncommon' | 'meta') {
  const table =
    type == 'meta'
      ? $s.expensiveMetaTags
      : type == 'uncommon'
        ? $s.expensiveUncommonTags
        : $s.expensiveCommonTags;
  return db.select().from(table).all();
}
