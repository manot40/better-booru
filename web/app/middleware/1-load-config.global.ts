import type { $Fetch } from 'ofetch';

import { client } from '~/api/client.gen';

export default defineNuxtRouteMiddleware(() => {
  const nuxt = useNuxtApp();
  const config = useUserConfig();
  const runConfig = useRuntimeConfig();

  if (nuxt.isHydrating) config.populate();

  const fallback = import.meta.env.BASE_URL || 'http://localhost:3001';

  client.setConfig({
    baseUrl: runConfig.public.baseUrl || (typeof location != 'undefined' ? location.origin : fallback),
    ofetch: $fetch.create({
      onRequest({ options }) {
        if (typeof options.headers?.set !== 'function') {
          options.headers = new Headers({ ...options.headers });
        }

        if (import.meta.client) {
          const configStr = localStorage[STATIC.keys.userConfig];
          if (configStr) options.headers.set(`x-${STATIC.keys.userConfig}`, btoa(configStr));
        }
      },
    }) as $Fetch,
  });
});
