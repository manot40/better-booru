import { Elysia } from 'elysia';

import { cors } from '@elysiajs/cors';
import { etag } from '@bogeychan/elysia-etag';
import { staticPlugin } from '@elysiajs/static';

import { caching, images, logixlysia, scrap, spa, userConfig } from 'plugins';

import * as Post from 'handlers/post';
import * as PostTags from 'handlers/post-tags';
import * as PostDetail from 'handlers/post-detail';
import * as Autocomplete from 'handlers/autocomplete';

const setup = new Elysia()
  .use(scrap)
  .use(etag())
  .use(cors())
  .use(images)
  .use(userConfig)
  .use(logixlysia)
  .use(staticPlugin({ alwaysStatic: true, prefix: '/' }))
  .use(caching({ matches: [/^\/api\/(post|autocomplete)/] }));

const api = new Elysia({ prefix: '/api' })
  .get('/posts', <any>Post.handler, Post.schema)
  .get('/posts/:id', <any>PostDetail.handler, PostDetail.schema)
  .get('/posts/:id/tags', <any>PostTags.handler, PostTags.schema)
  .get('/autocomplete', <any>Autocomplete.handler, Autocomplete.schema);

export const app = setup.use(spa).use(api);

export type Setup = typeof setup;
export type Backend = typeof app;
