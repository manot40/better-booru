import type { TagWithCount } from 'plugins/expensive-tags';
import type { PostRelations } from 'db/schema';
import type { TagCategoryID } from '@boorugator/shared/types';

import { getPostTagsRel, Transaction } from './common';

import { db, schema as $s } from 'db';
import { and, between, eq, inArray, sql } from 'drizzle-orm';

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

type OptionalParams = {
  /** Relation filtering mode (default to `AND`) */
  mode?: 'OR' | 'AND';
  range?: [number, number];
  expensive?: Expensivenes;
};
export const createRelationFilterFn =
  (qb: typeof db | Transaction, optional = {} as OptionalParams) =>
  <R extends PostRelations>(rel: R, ids: number[]) => {
    let cursor: ReturnType<typeof between> | undefined;
    const { mode = 'AND', range, expensive } = optional;

    if (range) {
      const q = between(rel.post_id, range[1], range[0]);
      if (expensive) {
        const expensiveIds = expensive.tags.map((t) => t.id);
        const hasExpTags = ids.some((id) => expensiveIds.includes(id));
        if (!(hasExpTags && expensive.complex)) (hasExpTags || expensive.complex) && (cursor = q);
      } else cursor = q;
    }

    const selection = qb.select({ post_id: rel.post_id }).from(rel);
    if (ids.length == 1) return selection.where(and(cursor, eq(rel.tag_id, ids[0])));

    const withFilter = selection.where(and(cursor, inArray(rel.tag_id, ids)));
    if (mode === 'OR') return withFilter;
    return withFilter.groupBy(rel.post_id).having(sql`count(${rel.tag_id}) = ${ids.length}`);
  };

export type Expensivenes = {
  tags: TagWithCount[];
  complex?: boolean;
};
