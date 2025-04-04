import type { UserConfig } from 'booru-shared/types';

import { Elysia, type InferContext } from 'elysia';

import { etag } from '@bogeychan/elysia-etag';
import { swagger } from '@elysiajs/swagger';

import * as Post from './handlers/post';
import * as PostTags from './handlers/post-tags';
import * as Autocomplete from './handlers/autocomplete';

import { STATIC } from 'booru-shared';
import { elysiaIPXHandler } from './lib/ipx';

const setup = new Elysia()
  .use(etag())
  .use(swagger())
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

const app = setup.use(api).get('/image/*', elysiaIPXHandler).listen(3001);

console.log(`🦊 Server Listening at ${app.server?.hostname}:${app.server?.port}`);

export type Setup = typeof setup;
export type Backend = typeof app;
export type Context = InferContext<Setup>;
