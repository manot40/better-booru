import { Elysia, type InferContext } from 'elysia';

import { cors } from '@elysiajs/cors';
import { etag } from '@bogeychan/elysia-etag';
import { staticPlugin } from '@elysiajs/static';

import { elysiaIPXHandler } from 'lib/ipx';
import { caching, scrap, userConfig } from 'plugins';

import * as Post from './handlers/post';
import * as PostTags from './handlers/post-tags';
import * as Autocomplete from './handlers/autocomplete';

const setup = new Elysia()
  .use(scrap)
  .use(etag())
  .use(cors())
  .use(userConfig)
  .use(staticPlugin({ indexHTML: true, prefix: '/' }))
  .use(caching({ pathRegex: [/^\/api\/(post|autocomplete)/] }));

const app = new Elysia({ prefix: '/api' })
  .get('/post', <any>Post.handler, Post.schema)
  .get('/post/:id/tags', <any>PostTags.handler, PostTags.schema)
  .get('/autocomplete', <any>Autocomplete.handler, Autocomplete.schema);

setup
  .use(app)
  .get('/image/*', elysiaIPXHandler)
  .listen(process.env.PORT || 3000);

console.info(`Server started on port ${process.env.PORT || 3000}`);

export type Setup = typeof setup;
export type Backend = typeof app;
export type Context = InferContext<Setup>;
