import type { UserConfig } from '@boorugator/shared/types';

import { STATIC } from '@boorugator/shared';

import { Elysia } from 'elysia';

export const userConfig = new Elysia({ name: 'user-config' }).derive({ as: 'scoped' }, ({ cookie }) => {
  const { value } = cookie[STATIC.keys.userConfig] || {};
  let userConfig: UserConfig | undefined;
  try {
    if (value) userConfig = JSON.parse(value);
  } catch {}
  return { userConfig };
});
