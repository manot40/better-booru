import type { UserConfig } from '@boorugator/shared/types';

import { Elysia, type InferContext } from 'elysia';

import logixlysia from 'logixlysia';
import { etag } from '@bogeychan/elysia-etag';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';

import * as Post from './handlers/post';
import * as PostTags from './handlers/post-tags';
import * as Autocomplete from './handlers/autocomplete';

import { STATIC } from '@boorugator/shared';
import { elysiaIPXHandler } from './lib/ipx';

const setup = new Elysia()
  .use(etag())
  .use(cors())
  .use(
    logixlysia({
      config: {
        ip: true,
        timestamp: { translateTime: 'yyyy-mm-dd HH:MM' },
        customLogFormat: '{now} {level} {duration} {method} {status} {message} {ip} {pathname}',
      },
    })
  )
  .use(swagger())
  .use(staticPlugin({ indexHTML: true, prefix: '/' }))
  .derive(({ cookie }) => {
    const { value } = cookie[STATIC.keys.userConfig] || {};
    let userConfig: UserConfig | undefined;
    try {
      if (value) userConfig = JSON.parse(value);
    } catch {}
    return { userConfig };
  });

const api = new Elysia({ prefix: '/api' })
  .get('/post', <any>Post.handler, Post.schema)
  .get('/post/:id/tags', <any>PostTags.handler, PostTags.schema)
  .get('/autocomplete', <any>Autocomplete.handler, Autocomplete.schema);

const app = setup
  .use(api)
  .get('/image/*', elysiaIPXHandler)
  .listen(process.env.PORT || 3000);

export type Setup = typeof setup;
export type Backend = typeof app;
export type Context = InferContext<Setup>;
