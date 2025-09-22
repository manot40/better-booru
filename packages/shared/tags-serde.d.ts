export declare type TagAST =
  | { type: 'tag'; value: string }
  | { type: 'not'; value: TagAST }
  | { type: 'or'; value: TagAST }
  | { type: 'group'; value: TagAST[] };

export declare interface ParseResult {
  ast: TagAST[];
  tags: string[];
}

export declare function parseTags(input: string): ParseResult;
export declare function serializeTags(exprs: TagAST[]): string;
