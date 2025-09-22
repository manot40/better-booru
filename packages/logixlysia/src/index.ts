import type { HttpError, Options, Server } from './types';

import { Elysia } from 'elysia';

import { startServer } from './plugins';
import { createLogger } from './core';
import { getStatusCode } from './utils/status';

export default function createLogixlysia(options?: Options) {
  const logger = createLogger(options);
  const middleware = new Elysia({ name: 'Logixlysia', seed: options })
    .state('beforeTime', 0n)
    .decorate('log', logger.log)
    .decorate('logRequest', logger.logRequest)
    .onStart((ctx) => {
      const showStartupMessage = options?.config?.showStartupMessage ?? true;
      if (showStartupMessage) startServer(ctx.server as Server, options);
    })
    .onRequest(({ store }) => {
      store.beforeTime = process.hrtime.bigint();
    })
    .onAfterHandle({ as: 'global' }, ({ request, set, store, logRequest }) => {
      const status = getStatusCode(set.status || 200);
      const data = { status, message: String(set.headers?.['x-message'] || '') };
      logRequest({ data, level: 'INFO', store, request });
    })
    .onError({ as: 'global' }, ({ request, error, set, store }) => {
      const status = getStatusCode(set.status || 500);
      logger.handleHttpError(request, { ...error, status } as HttpError, store);
    })
    .as('global');

  return { log: logger.log, middleware };
}

export { createLogger, handleHttpError } from './core';
export { logToTransports } from './transports';
