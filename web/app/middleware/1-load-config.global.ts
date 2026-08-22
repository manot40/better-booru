import { client } from '~/api/client.gen';

export default defineNuxtRouteMiddleware(() => {
  const nuxt = useNuxtApp();
  const userData = useUserData();
  const userConfig = useUserConfig();
  const runtimeConfig = useRuntimeConfig();

  if (nuxt.isHydrating) {
    userData.initialize();
    userConfig.initialize();

    const fallback = import.meta.env.BASE_URL || 'http://localhost:3001';

    client.setConfig({
      baseUrl: runtimeConfig.public.baseUrl || (typeof location != 'undefined' ? location.origin : fallback),
      onRequest({ options }) {
        if (typeof options.headers?.set !== 'function') {
          options.headers = new Headers({ ...options.headers });
        }

        if (import.meta.client) {
          const configStr = localStorage[STATIC.keys.userConfig];
          if (configStr) options.headers.set(`x-${STATIC.keys.userConfig}`, btoa(configStr));
        }
      },
    });
  }
});
