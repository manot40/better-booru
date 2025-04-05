import type { UserConfig } from '@boorugator/shared/types';
import type { HistoryStore } from '~/lib/query-store';

import { CookieStore, SessionStore, UrlQueryStore, STORE_KEY } from '~/lib/query-store';

export interface UsePagination<T extends object> extends HistoryStore<T> {
  getTotalPage: (count: number, perPage: number) => number;
}

export const usePaginationQuery = <T extends object>(): UsePagination<T> => {
  const config = useUserConfig();

  const result = shallowReactive(<UsePagination<T>>{});

  watch(() => config.historyMode, changeMode, { immediate: true });
  function changeMode(mode: UserConfig['historyMode'], from: UserConfig['historyMode']) {
    const Store = mode == 'cookie' ? CookieStore : mode == 'session' ? SessionStore : UrlQueryStore;

    const store = new Store(result.query?.value);
    Object.assign(result, {
      query: store.query,
      set: store.set.bind(store),
      reset: store.reset.bind(store),
      update: store.update.bind(store),
    });

    if (from === 'cookie') useCookie(STORE_KEY).value = null;
    else if (from === 'session') sessionStorage.removeItem(STORE_KEY);
    else if (from === 'url_query') navigateTo({ query: {} }, { replace: true });
  }

  return result;
};
