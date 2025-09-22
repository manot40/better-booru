import { LogLevel } from '../types';

type ColorMap<T extends string = string> = {
  [K in T]: (str: string) => string;
};

const createBgColorFn = (bg: string, fg: string) => (str: string) => `\x1b[${bg};${fg}m${str}\x1b[0m`;
const createBunColorFn = (color: string) => (str: string) => `${Bun.color(color, 'ansi')}${str}\x1b[0m`;

export const LogLevelColorMap: ColorMap<LogLevel> = {
  INFO: createBgColorFn('30', '42'),
  ERROR: createBgColorFn('30', '41'),
  WARNING: createBgColorFn('30', '43'),
  NEUTRAL: createBgColorFn('30', '47'),
};

export const HttpMethodColorMap: ColorMap = {
  GET: createBunColorFn('green'),
  POST: createBunColorFn('yellow'),
  PUT: createBunColorFn('blue'),
  PATCH: createBunColorFn('#FD3D85'),
  DELETE: createBunColorFn('red'),
  HEAD: createBunColorFn('cyan'),
  OPTIONS: createBunColorFn('magenta'),
};

export const textColor = (color: string, text: string) => `${Bun.color(color, 'ansi')}${text}\x1b[0m`;
