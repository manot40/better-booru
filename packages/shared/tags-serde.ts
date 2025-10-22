export function parseTags(input: string): ParseResult {
  const tokens = input.split(' ');
  const result: ParseResult = { ast: [], tags: [] };

  let i = 0;

  function parseExpr(token: string): TagAST | undefined {
    const hasMod = /^(-|~|\()/.test(token);

    if (!hasMod) {
      result.tags.push(token);
      return { type: 'tag', value: token };
    }

    const mod = token[0] as '-' | '~' | '(';
    const val = token.slice(1);

    switch (mod) {
      case '-':
      case '~':
        const value = parseExpr(val)!;
        return { type: mod === '-' ? 'not' : 'or', value };

      case '(': {
        let isEnding = val.endsWith(')');
        let nextToken = val;
        const members: TagAST[] = [];

        while (true) {
          if (isEnding) {
            const member = parseExpr(nextToken.slice(0, -1));
            if (member) members.push(member);
            break;
          }

          const member = parseExpr(nextToken);
          if (member) members.push(member);

          nextToken = tokens[++i]?.trim() || '';
          if (!nextToken) break;

          isEnding = /^(?!.*_).*\)$/.test(nextToken) || nextToken.endsWith('))');
        }

        return { type: 'group', value: members };
      }

      default:
        throw new Error(`Unexpected token: ${token}`);
    }
  }

  while (i < tokens.length) {
    const sanitized = tokens[i]!.trim();

    if (sanitized) {
      const node = parseExpr(sanitized);
      if (node) result.ast.push(node);
    }

    i++;
  }

  return result;
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
