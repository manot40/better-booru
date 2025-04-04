import type { Backend } from 'booru-server';

import { edenFetch } from '@elysiajs/eden';

export const eden = edenFetch<Backend>(API_URL);
