export declare const throttleDebounce: <T extends any[], R = any>(
  fn: (...args: T) => R,
  delay: number
) => typeof fn;
export declare const startCase: (str: string) => string;
export declare const preciseCompare: (a: number, b: number, precision?: number) => boolean;
export declare const pluralify: (word: string, count: number, withCount?: boolean) => string;
