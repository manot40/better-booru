import type { LogPayload } from '../types';

import { buildLogMessage } from '../core/buildLogMessage';

export async function logToTransports(opts: LogPayload): Promise<void> {
  const { level, store, data, request, options } = opts;
  if (!options?.config?.transports || options.config.transports.length === 0) {
    return;
  }

  const message = buildLogMessage({ ...opts, useColors: false });

  const promises = options.config.transports.map((transport) =>
    transport.log(level, message, { request, data, store })
  );

  await Promise.all(promises);
}
