import type { HttpError, LogPayload } from '../types';

import { logToFile } from '../transports';
import { buildLogMessage } from './buildLogMessage';

export function handleHttpError(
  error: HttpError,
  opts: Pick<LogPayload, 'store' | 'request' | 'options'>
): void {
  const filePath = opts.options?.config?.logFilePath;
  const statusCode = error.status || 500;
  console.error(buildLogMessage({ level: 'ERROR', data: { status: statusCode }, ...opts }));

  const promises = [];
  if (filePath) promises.push(logToFile(filePath, { level: 'ERROR', data: { status: statusCode }, ...opts }));
}
