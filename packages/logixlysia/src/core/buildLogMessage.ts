import { LogComponents, LogPayload, Options } from '../types';
import {
  durationString,
  formatTimestamp,
  LogLevelColorMap,
  logString,
  methodString,
  pathString,
  statusString,
} from '../utils';

const defaultLogFormat = '🦊 {now} {level} {duration} {method} {pathname} {status} {message} {ip}';

function shouldUseColors(useColors: boolean, options?: Options): boolean {
  if (options?.config?.useColors !== undefined) {
    return options.config.useColors && process.env.NO_COLOR === undefined;
  }
  return useColors && process.env.NO_COLOR === undefined;
}

export function buildLogMessage(opts: LogPayload): string {
  const { level, store, data, request: req, options, useColors = true } = opts;
  const { customLogFormat, timestamp, ip } = options?.config || {};

  const now = new Date();
  const clientIP = req?.headers.get('cf-connecting-ip') || req?.headers.get('x-forwarded-for');
  const logFormat = customLogFormat || defaultLogFormat;
  const actuallyUseColors = shouldUseColors(useColors, options);

  const components: LogComponents = {
    now: actuallyUseColors
      ? LogLevelColorMap['NEUTRAL'](formatTimestamp(now, timestamp))
      : formatTimestamp(now, timestamp),
    epoch: Math.floor(now.getTime() / 1000).toString(),
    level: logString(level, useColors),
    duration: store ? durationString(store.beforeTime, useColors) : '',
    method: req ? methodString(req.method, useColors) : '',
    pathname: req ? pathString(req) : '',
    status: typeof data == 'object' ? statusString(data?.status || 200, useColors) : '',
    message: typeof data == 'string' ? data : data?.message || '',
    ip: ip && clientIP ? `IP: ${clientIP}` : '',
  };

  return logFormat.replace(/{(\w+)}/g, (_, key: keyof LogComponents) => {
    if (key in components) return components[key] || '';
    return '';
  });
}
