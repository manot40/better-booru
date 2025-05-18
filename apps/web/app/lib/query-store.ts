import type { CookieRef } from '#app';
import type { RouteLocationNormalized as RouteLoc, Router } from 'vue-router';

export const STORE_KEY = 'nav_history';

class BaseStore<T extends object = object> {
  public query: Ref<Query<T>>;

  protected init: T;

  constructor(initial?: T) {
    const init = (this.init = <Query<T>>{ page: 1, ...initial });
    const query = (this.query = useState(STORE_KEY));
    query.value = init;
  }

  static getTotalPage(count: number, perPage: number) {
    return Math.ceil(count / perPage) || 1;
  }

  set(newQuery: T, _?: any) {
    const nq = newQuery as Query<T>;
    nq.page ??= 1;
    this.query.value = nq;
  }

  update(newQuery: ModifiedQuery<T>, _?: any) {
    const result = Object.assign({ ...this.query.value }, newQuery);
    if (this.query.value.page < 0) delete (result as { page?: number }).page;
    this.query.value = result;
  }

  reset() {
    this.query.value = <Query<T>>this.init;
  }
}

export class CookieStore<T extends object> extends BaseStore<T> implements HistoryStore<T> {
  private cookie: CookieRef<T>;

  constructor(initial?: T) {
    const cookie = useCookie<T>(STORE_KEY, { maxAge: 60 * 60 * 24 * 365 });
    const defaults = typeof cookie.value == 'object' ? cookie.value : ({} as T);
    super({ ...initial, ...defaults });
    this.cookie = cookie;
  }

  override set(newQuery: T) {
    super.set(newQuery);
    this.cookie.value = this.query.value;
  }

  override update(newQuery: ModifiedQuery<T>) {
    super.update(newQuery);
    this.cookie.value = this.query.value;
  }

  override reset() {
    super.reset();
    this.cookie.value = this.query.value;
  }
}

export class SessionStore<T extends object> extends BaseStore<T> implements HistoryStore<T> {
  constructor(initial?: T) {
    const defaults: T = import.meta.client ? JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}') : {};
    const init = { ...initial, ...defaults };
    super(init);
  }

  override set(newQuery: T) {
    super.set(newQuery);
    sessionStorage.setItem(STORE_KEY, JSON.stringify(this.query.value));
  }

  override update(newQuery: ModifiedQuery<T>) {
    super.update(newQuery);
    sessionStorage.setItem(STORE_KEY, JSON.stringify(this.query.value));
  }

  override reset() {
    super.reset();
    sessionStorage.removeItem(STORE_KEY);
  }
}

export class UrlQueryStore<T extends object> extends BaseStore<T> implements HistoryStore<T> {
  private router: Router;

  constructor(initial?: T) {
    const route = useRoute();
    const router = useRouter();

    const init = <Query<T>>UrlQueryStore.processQuery({ page: 1, ...initial, ...route.query });
    super(init);
    this.router = router;

    const routeListener = useThrottleFn((to: RouteLoc, from: RouteLoc) => {
      if (to.query === from.query) return;

      if (to.path !== from.path) {
        if (to.path === '/') super.reset();
        return;
      }

      /** When router query empty, fallback to initial query state */
      if (!Object.keys(to.query).length) super.reset();
      else super.set(<Query<T>>UrlQueryStore.processQuery(to.query));
    });

    onUnmounted(router.afterEach(routeListener));
  }

  static processQuery = <T extends object>(query: T) =>
    Object.entries(query).reduce(
      (acc, [key, value]) => {
        if (value === undefined || value === '') return acc;

        if (value === 'null') acc[key] = null;
        else if (value === 'true' || value === 'false') acc[key] = value === 'true';
        else if (value !== null && !isNaN(+value)) acc[key] = +value;
        else acc[key] = value;

        return acc;
      },
      {} as Record<string, any>
    ) as T;

  override set(newQuery: T, replace?: boolean) {
    super.set(newQuery);
    this.router[replace ? 'replace' : 'push']({ query: this.query.value });
  }

  override update(newQuery: ModifiedQuery<T>, replace?: boolean) {
    super.update(newQuery);
    this.router[replace ? 'replace' : 'push']({ query: this.query.value });
  }

  override reset() {
    super.reset();
    this.router.push({ query: <Record<string, string>>this.init });
  }
}

export type Query<T extends object> = T & { page: number };
export type ModifiedQuery<T extends object> = Partial<Query<T>> & Record<string, Primitive>;

export interface HistoryStore<T extends object> {
  query: Ref<T>;
  set: (newQuery: Query<T>, opts?: any) => void;
  reset: () => void;
  update: (newQuery: ModifiedQuery<T>, opts?: any) => void;
}
