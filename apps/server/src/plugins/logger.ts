import createLogixlysia from '@boorugator/logixlysia';

const LOG_FORMAT = '{now} {level} {duration} {method} {status} {message} {ip} {pathname}';

export const { log, middleware: logixlysia } = createLogixlysia({
  config: { ip: true, timestamp: { translateTime: 'yyyy-mm-dd HH:MM' }, customLogFormat: LOG_FORMAT },
});
