import logixlysia from 'logixlysia';

const LOG_FORMAT = '{now} {level} {duration} {method} {status} {message} {ip} {pathname}';

export const logger = logixlysia({
  config: { ip: true, timestamp: { translateTime: 'yyyy-mm-dd HH:MM' }, customLogFormat: LOG_FORMAT },
});
