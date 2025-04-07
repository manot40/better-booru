import type { Backend } from '@boorugator/server';

import { treaty } from '@elysiajs/eden/treaty2';

export const eden = treaty<Backend>(BASE_URL);
