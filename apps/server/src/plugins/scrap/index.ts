import Elysia from 'elysia';

import { run } from './worker';

import { cron, Patterns } from '@elysiajs/cron';

export const scrap = new Elysia()
  .use(cron({ run, name: 'scrap', pattern: Patterns.EVERY_2_HOURS }))
  .onBeforeHandle({ as: 'local' }, ({ query, headers, error }) => {
    const token = query.token || headers['authorization'];
    if (token !== process.env.DANBOORU_API_KEY) return error(401, 'Unauthorized');
  })
  .get('/scrap/stop', ({ store }) => {
    const cron = store.cron.scrap;
    if (cron.isRunning()) return cron.pause() ? 'Success' : 'Failed';
    return 'Not Running';
  })
  .get('/scrap/start', ({ store }) => {
    const cron = store.cron.scrap;
    if (cron.isRunning()) return 'Already Running';
    return cron.resume() ? 'Success' : 'Failed';
  })
  .get('/scrap/trigger', ({ store }) => {
    const cron = store.cron.scrap;
    if (cron.isBusy()) return 'Currently Working';
    cron.trigger();
    return 'Success';
  })
  .get('/scrap/status', ({ store }) => {
    const cron = store.cron.scrap;
    return { isRunning: cron.isBusy(), previous: cron.previousRun(), next: cron.nextRuns(10) };
  });
