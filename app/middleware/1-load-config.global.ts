import { isEqual } from 'ohash';

export default defineNuxtRouteMiddleware(() => {
  const nuxt = useNuxtApp();
  const ucfg = useUserConfig();

  if (import.meta.server || nuxt.isHydrating) ucfg.populate();

  if (nuxt.isHydrating && 'cookieStore' in window) {
    (<EventSource>window.cookieStore).addEventListener('change', function (e) {
      const [data] = (e as CookieEvent).changed;
      if (!data) return;
      const serialized = JSON.parse(decodeURIComponent(data.value));
      if (!isUserConfig(serialized) || isEqual(serialized, ucfg.asState)) return;
      Object.assign(ucfg, serialized);
    });
  }
});

type CookieData = {
  domain: string | null;
  name: string;
  expires: number;
  path: string;
  secure: boolean;
  value: string;
};

interface CookieEvent extends MessageEvent {
  changed: CookieData[];
  deleted: CookieData[];
  timeStamp: number;
}
