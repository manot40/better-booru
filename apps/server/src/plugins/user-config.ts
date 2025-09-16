import type { UserConfig } from '@boorugator/shared/types';

import { STATIC } from '@boorugator/shared';

import { destr } from 'destr';
import { Elysia } from 'elysia';

export const userConfig = new Elysia({ name: 'user-config' }).derive({ as: 'scoped' }, (ctx) => {
  const { cookie, path, set } = ctx;
  const { value } = cookie[STATIC.keys.userConfig] || {};

  // Only when hitting homepage or API routes
  if (!/(^\/$|^\/api\/post)/.test(path)) return;

  const config = destr<UserConfig | undefined>(value);
  if (!config) return;

  set.cookie ??= {};
  set.cookie[STATIC.keys.userConfig] = {
    path: '/',
    value: JSON.stringify(config),
    maxAge: 180 * 24 * 60 * 60,
  };

  return { userConfig: config };
});
