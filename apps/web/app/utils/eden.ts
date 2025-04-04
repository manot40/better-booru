import type { Backend } from 'booru-server';

import { treaty } from '@elysiajs/eden';

export const eden = treaty<Backend>(API_URL);
