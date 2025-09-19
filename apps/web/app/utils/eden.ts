import type { Backend } from '@boorugator/server';

import { treaty } from '@elysiajs/eden';

export const eden = treaty<Backend>('_', {
  // @ts-expect-error - Don't know what causing this error
  fetcher(_url, options = {}) {
    const headers = <Record<string, string>>(options.headers ??= {});

    const oriUrl = new URL(_url as string);
    const url = new URL(oriUrl.pathname + oriUrl.search || '', getBaseURL());

    if (import.meta.client) {
      const configStr = localStorage[STATIC.keys.userConfig];
      if (configStr) headers[`x-${STATIC.keys.userConfig}`] = btoa(configStr);
    }

    return fetch(url, options);
  },
});
