import type { Backend } from '@boorugator/server';

import { treaty } from '@elysiajs/eden/treaty2';

export const eden = treaty<Backend>('_', {
  // @ts-expect-error - Don't know what causing this error
  fetcher(_url, options) {
    const oriUrl = new URL(_url as string);
    const url = new URL(oriUrl.pathname + oriUrl.search || '', getBaseURL());
    return fetch(url, options);
  },
});
