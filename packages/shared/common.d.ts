import type { Provider, UserConfig } from './types/common';
export declare const processRating: (provider: Provider, rating: string | undefined, tags?: string) => string;
export declare function stringDigest(text: string, algo?: string): Promise<string>;
export declare function imgAlias(url_: string, provider: Provider): string;
export declare function imageAspectRatio(width: number, height: number): [number, number];
export declare const unshortenUrl: (url: string) => string;
// @ts-ignore
export declare function isUserConfig<T = any>(payload: T): payload is UserConfig;
