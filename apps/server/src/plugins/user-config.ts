import type { UserConfig } from '@boorugator/shared/types';

import { STATIC } from '@boorugator/shared';

import { destr } from 'destr';
import { Elysia } from 'elysia';

export const userConfig = new Elysia({ name: 'user-config' }).derive({ as: 'scoped' }, (ctx) => {
  const { cookie, headers, path } = ctx;
  const { value: fromCookie } = cookie[STATIC.keys.userConfig] || {};
  const fromHeaders = headers[`x-${STATIC.keys.userConfig}`];

  const configString = fromHeaders ? Buffer.from(fromHeaders, 'base64').toString('utf-8') : fromCookie;

  // Only when hitting homepage or API routes
  if (!/(^\/$|^\/api\/post)/.test(path)) return;

  const config = destr<UserConfig | undefined>(configString);
  if (!config) return;

  return { userConfig: config };
});
