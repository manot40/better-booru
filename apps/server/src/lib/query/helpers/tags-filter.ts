import type { TagWithCount } from 'plugins/expensive-tags';
import type { PostRelations } from 'db/schema';
import type { TagCategoryID } from '@boorugator/shared/types';

import { getPostTagsRel, getRangeFilter, Transaction } from './common';

import { db, schema as $s } from 'db';
import { and, eq, inArray, sql } from 'drizzle-orm';

type FilterFn = <T extends PostRelations>(rel: T, ids: number[]) => any;
export function generateTagsFilterQuery<T extends FilterFn>(
  fn: T,
  cat: TagCategoryID,
  ids: number[]
): ReturnType<T>[] {
  if (cat === 1) return [];
  if (cat === 0 || cat === 2) {
    const q = <ReturnType<T>[]>[];
    const common = ids.filter((id) => id <= 800);
    const uncommon = ids.filter((id) => id > 800);
    if (common.length > 0) q.push(fn($s.commonTags, common));
    if (uncommon.length > 0) q.push(fn($s.uncommonTags, uncommon));
    return q;
  } else return [fn(getPostTagsRel(cat), ids)];
}

export const createRelationFilterFn =
  (qb: typeof db | Transaction, range?: [number, number], expensive?: Expensivenes) =>
  <R extends PostRelations>(rel: R, ids: number[]) => {
    let cursor: ReturnType<typeof getRangeFilter> = [];
    if (range) {
      const filter = getRangeFilter(rel, range);
      if (expensive) {
        const expensiveIds = expensive.tags.map((t) => t.id);
        const hasExpTags = ids.some((id) => expensiveIds.includes(id));
        if (!(hasExpTags && expensive.complex)) (hasExpTags || expensive.complex) && (cursor = filter);
      } else cursor = filter;
    }

    const selection = qb.select({ post_id: rel.post_id }).from(rel);
    if (ids.length == 1) return selection.where(and(...cursor, eq(rel.tag_id, ids[0])));
    return selection
      .where(and(...cursor, inArray(rel.tag_id, ids)))
      .groupBy(rel.post_id)
      .having(sql`count(${rel.tag_id}) = ${ids.length}`);
  };

export type Expensivenes = {
  tags: TagWithCount[];
  complex?: boolean;
};
