import chalk from 'chalk';

import { LogComponents, LogPayload, Options } from '../types';
import { durationString, formatTimestamp, logString, methodString, pathString, statusString } from '../utils';

const defaultLogFormat = '🦊 {now} {level} {duration} {method} {pathname} {status} {message} {ip}';

function shouldUseColors(useColors: boolean, options?: Options): boolean {
  if (options?.config?.useColors !== undefined) {
    return options.config.useColors && process.env.NO_COLOR === undefined;
  }
  return useColors && process.env.NO_COLOR === undefined;
}

export function buildLogMessage(opts: LogPayload): string {
  const { level, store, data, request, options, useColors = true } = opts;
  const actuallyUseColors = shouldUseColors(useColors, options);
  const now = new Date();
  const components: LogComponents = {
    now: actuallyUseColors
      ? chalk.bgYellow(chalk.black(formatTimestamp(now, options?.config?.timestamp)))
      : formatTimestamp(now, options?.config?.timestamp),
    epoch: Math.floor(now.getTime() / 1000).toString(),
    level: logString(level, useColors),
    duration: durationString(store.beforeTime, useColors),
    method: request ? methodString(request.method, useColors) : '',
    pathname: request ? pathString(request) : '',
    status: typeof data == 'object' ? statusString(data?.status || 200, useColors) : '',
    message: typeof data == 'string' ? data : data?.message || '',
    ip:
      options?.config?.ip && request?.headers.get('x-forwarded-for')
        ? `IP: ${request.headers.get('x-forwarded-for')}`
        : '',
  };

  const logFormat = options?.config?.customLogFormat || defaultLogFormat;

  return logFormat.replace(/{(\w+)}/g, (_, key: string) => {
    if (key in components) {
      return components[key as keyof LogComponents] || '';
    }
    return '';
  });
}
