import { isMetaTag } from 'utils/common';
import { parseTags, type TagAST } from '@boorugator/shared';

import { db, schema as $s } from 'db';
import { and, arrayContains, arrayOverlaps, not, or, type SQL } from 'drizzle-orm';

const table = $s.postTable;

export async function tagsToQuery(tagString: string): Promise<SQL | SQL[] | undefined> {
  const { ast, tags } = parseTags(tagString);

  const tagsMap = await db.query.tagsTable
    .findMany({
      where: (table, { inArray }) => inArray(table.name, tags),
      orderBy: (table, { asc }) => asc(table.name),
    })
    .then((tags) => {
      return new Map(tags.map((t) => [t.name, { id: t.id, isMeta: isMetaTag(t.category) }]));
    });

  const orOp = <Record<'meta' | 'tags', number[]>>{};
  const andOp = <Record<'meta' | 'tags', TagsFilter>>{};

  ast.forEach((a) => tagAstToQuery(a));
  function tagAstToQuery(ast: TagAST, ctx?: TagAST['type']) {
    if (ctx === ast.type) return;
    switch (ast.type) {
      case 'tag':
        const tagData = tagsMap.get(ast.value);
        if (!tagData) return;

        const key = tagData.isMeta ? 'meta' : 'tags';
        if (ctx == 'or') {
          const target = (orOp[key] ??= []);
          return target.push(tagData.id);
        } else {
          const target = (andOp[key] ??= {});
          const targetIds = (target[ctx === 'not' ? 'ne' : 'eq'] ??= []);
          return targetIds.push(tagData.id);
        }

      case 'group':
        /** @todo Implement tag grouping */
        break;

      default:
        if (ast.value.type === 'tag') return tagAstToQuery(ast.value, ast.type);
    }
  }

  const andFilters = <SQL[]>[];
  Object.entries(andOp).reduce((acc, [key, value]) => {
    const column = key === 'meta' ? table.meta_ids : table.tag_ids;
    if (value?.eq) andFilters.push(arrayContains(column, value.eq));
    if (value?.ne) andFilters.push(not(arrayOverlaps(column, value.ne)));
    return acc;
  }, andFilters);

  const orFilters = <SQL[]>[];
  Object.entries(orOp).reduce((acc, [key, value]) => {
    const column = key === 'meta' ? table.meta_ids : table.tag_ids;
    if (value?.length) orFilters.push(arrayOverlaps(column, value));
    return acc;
  }, orFilters);

  if (!andOp.meta && !andOp.tags) return or(...orFilters);
  else if (!orOp.meta && !orOp.tags) return andFilters;
  else return or(...orFilters, and(...andFilters));
}

type TagsFilter = {
  eq?: number[];
  ne?: number[];
};
