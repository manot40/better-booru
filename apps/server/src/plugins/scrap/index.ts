import { run } from './worker';

import { cron, Patterns } from '@elysiajs/cron';

export const scrap = cron({
  run,
  name: 'scrap',
  maxRuns: 1,
  pattern: Patterns.EVERY_2_HOURS,
});
