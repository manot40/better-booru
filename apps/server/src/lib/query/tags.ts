import { db, schema as $s } from 'db';

export function queryExpensiveTags(type: 'common' | 'uncommon') {
  const table = type == 'uncommon' ? $s.expensiveUncommonTags : $s.expensiveCommonTags;
  const result = db.select().from(table).all();
  return result.map((v) => v.name);
}
