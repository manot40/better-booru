import type { HttpError, Options, Server } from './types';

import { Elysia } from 'elysia';

import { startServer } from './plugins';
import { createLogger } from './core';
import { getStatusCode } from './utils/status';

export default function logixlysia(options?: Options) {
  const log = createLogger(options);
  return new Elysia({ name: 'Logixlysia', seed: options })
    .state('beforeTime', 0n)
    .decorate('log', log.log)
    .onStart((ctx) => {
      const showStartupMessage = options?.config?.showStartupMessage ?? true;
      if (showStartupMessage) startServer(ctx.server as Server, options);
    })
    .onRequest(({ store }) => {
      store.beforeTime = process.hrtime.bigint();
    })
    .onAfterHandle({ as: 'global' }, ({ request, set, store, log }) => {
      const status = getStatusCode(set.status || 200);
      const data = { status, message: String(set.headers?.['x-message'] || '') };
      log({ data, level: 'INFO', store, request });
    })
    .onError({ as: 'global' }, ({ request, error, set, store }) => {
      const status = getStatusCode(set.status || 500);
      log.handleHttpError(request, { ...error, status } as HttpError, store);
    })
    .as('global');
}

export { createLogger, handleHttpError } from './core';
export { logToTransports } from './transports';
