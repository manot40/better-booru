import { logToTransports } from '../transports';
import { logToFile } from '../transports';
import { Logger, LogPayload, Options } from '../types';
import { buildLogMessage } from './buildLogMessage';
import { filterLog } from './filter';
import { handleHttpError } from './handleHttpError';

async function log(opts: LogPayload): Promise<void> {
  const { level, store, data, request, options } = opts;
  if (!filterLog(level, request?.method, typeof data == 'string' ? 200 : data.status || 200, options)) return;

  const logMessage = buildLogMessage({ level, store, request, data, options });
  console.log(logMessage);

  const promises = [];
  if (options?.config?.logFilePath) promises.push(logToFile(options.config.logFilePath, opts));
  if (options?.config?.transports?.length) promises.push(logToTransports(opts));

  await Promise.all(promises);
}

export function createLogger(options?: Options): Logger {
  return {
    log: (level, data) => log({ level, data, options }),
    logRequest: (opts) => log({ ...opts, options }),
    customLogFormat: options?.config?.customLogFormat,
    handleHttpError: (request, error, store) => handleHttpError(error, { request, store, options }),
  };
}
