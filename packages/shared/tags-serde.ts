export function parseTags(input: string): ParseResult {
  let i = 0;
  const tagSet = new Set<string>();
  const nestedTagsErr = new Error('Nested tag groups violation');
  const invalidTagsErr = new Error('Malformed tags format');

  function skipWs() {
    while (input[i] === ' ') i++;
  }

  function parseExpr(inGroup = false, ctx?: TagAST['type']): TagAST | undefined {
    skipWs();

    if (i >= input.length) return;

    switch (input[i]) {
      case '(': {
        const notGroup = input[i - 1] === '_';

        if (inGroup) throw nestedTagsErr;
        else i++;

        if (notGroup) return;

        const members: TagAST[] = [];
        while (true) {
          skipWs();

          if (input[i] === ')') {
            i++;
            break;
          }

          let child = parseExpr(true);
          if (child) members.push(child);
          skipWs();
        }

        return { type: 'group', value: members };
      }

      case ')':
        i++;
        return;

      case '-':
        if (ctx && ctx !== 'group') throw invalidTagsErr;
        i++;
        return { type: 'not', value: parseExpr(inGroup, 'not')! };

      case '~':
        if (ctx && ctx !== 'group') throw invalidTagsErr;
        i++;
        return { type: 'or', value: parseExpr(inGroup, 'or')! };

      default:
        let j = i;
        let notGroup = false;

        while (i < input.length && input[i] !== ' ') {
          if ('()'.includes(input[i]) && input[i - 1] !== '_') break;
          i++;
        }

        const tag = input.slice(j, i);
        const value = tag.includes('_(') ? `${tag})` : tag;

        tagSet.add(value);
        return { type: 'tag', value };
    }
  }

  const ast: TagAST[] = [];
  while (i < input.length) {
    skipWs();
    const node = parseExpr();
    if (node) ast.push(node);
  }
  return { ast, tags: Array.from(tagSet) };
}

export function serializeTags(exprs: TagAST[]): string {
  return exprs.map(serializeTagExpr).join(' ');
}
function serializeTagExpr(expr: TagAST): string {
  switch (expr.type) {
    case 'tag':
      return expr.value;
    case 'not':
      return '-' + serializeTagExpr(expr.value);
    case 'or':
      return '~' + serializeTagExpr(expr.value);
    case 'group':
      return '(' + expr.value.map(serializeTagExpr).join(' ') + ')';
  }
}

export type TagAST =
  | { type: 'tag'; value: string }
  | { type: 'not'; value: TagAST }
  | { type: 'or'; value: TagAST }
  | { type: 'group'; value: TagAST[] };

export interface ParseResult {
  ast: TagAST[];
  tags: string[];
}
