import type Elysia from 'elysia';

import { run } from './worker';

import { cron, Patterns } from '@elysiajs/cron';

export const scrap = (app: Elysia) =>
  app
    .use(cron({ run, name: 'scrap', pattern: Patterns.EVERY_2_HOURS }))
    .get('/scrap/stop', ({ store, query, headers, error }) => {
      const cron = store.cron.scrap;
      const token = query.token || headers['authorization'];
      if (token !== process.env.DANBOORU_API_KEY) return error(401, 'Unauthorized');
      if (cron.isRunning()) return cron.pause() ? 'Success' : 'Failed';
      return 'Not Running';
    })
    .get('/scrap/start', ({ store, query, headers, error }) => {
      const cron = store.cron.scrap;
      const token = query.token || headers['authorization'];
      if (token !== process.env.DANBOORU_API_KEY) return error(401, 'Unauthorized');
      if (cron.isRunning()) return 'Already Running';
      return cron.resume() ? 'Success' : 'Failed';
    });
