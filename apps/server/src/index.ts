import { Elysia, type InferContext } from 'elysia';

import { cors } from '@elysiajs/cors';
import { etag } from '@bogeychan/elysia-etag';
import { staticPlugin } from '@elysiajs/static';

import { elysiaIPXHandler } from 'lib/ipx';
import { caching, expensiveTags, logger, scrap, userConfig } from 'plugins';

import * as Post from './handlers/post';
import * as PostTags from './handlers/post-tags';
import * as Autocomplete from './handlers/autocomplete';

import handleError from 'handlers/error';

const setup = new Elysia()
  .use(scrap)
  .use(etag())
  .use(cors())
  .use(logger)
  .use(userConfig)
  .use(staticPlugin({ indexHTML: true, prefix: '/' }))
  .use(caching({ pathRegex: [/^\/api\/(post|autocomplete)/] }))
  .decorate('expensiveTags', expensiveTags());

const api = new Elysia({ prefix: '/api' })
  .get('/posts', <any>Post.handler, Post.schema)
  .get('/posts/:id/tags', <any>PostTags.handler, PostTags.schema)
  .get('/autocomplete', <any>Autocomplete.handler, Autocomplete.schema);

const app = new Elysia().use(api).get('/image/*', elysiaIPXHandler).onError({ as: 'scoped' }, handleError);

setup.use(app).listen(process.env.PORT || 3000);

export type Setup = typeof setup;
export type Backend = typeof app;
export type Context = InferContext<Setup>;
