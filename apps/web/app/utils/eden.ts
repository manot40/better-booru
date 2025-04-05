import type { Backend } from '@boorugator/server';

import { edenFetch } from '@elysiajs/eden';

export const eden = edenFetch<Backend>(API_URL);
