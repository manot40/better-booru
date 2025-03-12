import type { UserConfig } from '~~/types/common';
import type { QueryStore } from '~/lib/query-store';

import { cookieStore, sessionStore, urlQueryStore, STORE_KEY } from '~/lib/query-store';

export interface UsePagination<T extends object> extends QueryStore<T> {
  getTotalPage: (count: number, perPage: number) => number;
}

export const usePaginationQuery = <T extends object>(): UsePagination<T> => {
  const config = useUserConfig();

  function getTotalPage(count: number, perPage: number) {
    return Math.ceil(count / perPage) || 1;
  }

  const result = shallowReactive(<UsePagination<T>>{ getTotalPage });

  watch(() => config.historyMode, changeMode, { immediate: true });
  function changeMode(mode: UserConfig['historyMode'], from: UserConfig['historyMode']) {
    const currentQuery = result.query?.value;
    const store = mode == 'cookie' ? cookieStore : mode == 'session' ? sessionStore : urlQueryStore;
    Object.assign(result, store(currentQuery));

    if (from === 'cookie') useCookie(STORE_KEY).value = null;
    else if (from === 'session') sessionStorage.removeItem(STORE_KEY);
  }

  return result;
};
