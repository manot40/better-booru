export const STORE_KEY = 'nav_history';

export type Query<T extends object> = T & { page: number };

type CreateStore = <T extends object>(initial?: T) => QueryStore<T>;
type ModifiedQuery<T extends object> = Partial<Query<T>> & Record<string, Primitive>;

export interface QueryStore<T extends object> {
  query: Ref<Query<T>>;
  set: (newQuery: Query<T>, opts: any) => void;
  reset: () => void;
  update: (newQuery: ModifiedQuery<T>, opts: any) => void;
}

export const cookieStore: CreateStore = <T extends object>(initial?: T) => {
  const cookie = useCookie<T>(STORE_KEY, { maxAge: 60 * 60 * 24 * 365 });
  const defaults = typeof cookie.value == 'object' ? cookie.value : ({} as T);

  const init = { ...initial, ...defaults };
  const store = createtBaseStore(init);

  function set(newQuery: T) {
    cookie.value = store.set(newQuery);
  }

  function update(newQuery: ModifiedQuery<T>) {
    cookie.value = store.update(newQuery);
  }

  function reset() {
    store.reset();
    cookie.value = init;
  }

  return { set, update, reset, query: store.query };
};

export const sessionStore: CreateStore = <T extends object>(initial?: T) => {
  const defaults: T = import.meta.client ? JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}') : {};

  const init = { ...initial, ...defaults };
  const store = createtBaseStore(init);

  function set(newQuery: T) {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(store.set(newQuery)));
  }

  function update(newQuery: ModifiedQuery<T>) {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(store.update(newQuery)));
  }

  function reset() {
    store.reset();
    sessionStorage.removeItem(STORE_KEY);
  }

  return { set, update, reset, query: store.query };
};

export const urlQueryStore: CreateStore = <T extends object>(initial?: T) => {
  const route = useRoute();
  const router = useRouter();

  const init = <Query<T>>{ page: 1, ...initial, ...route.query };
  const store = createtBaseStore<T>(init);
  const query = store.query;

  const unsub = router.afterEach((to, from) => {
    if (to.path !== from.path) {
      if (to.path === '/') reset();
      return;
    }

    /** When router query empty, fallback to initial query state */
    if (!Object.keys(to.query).length) {
      query.value = init;
      return;
    }

    const processed = processQuery(to.query);
    query.value = processed as T & { page: number };
  });

  function set(newQuery: T, replace = false) {
    const query = store.set(newQuery);
    router[replace ? 'replace' : 'push']({ query });
  }

  function update(newQuery: ModifiedQuery<T>, replace = false) {
    const query = store.update(newQuery);
    router[replace ? 'replace' : 'push']({ query });
  }

  function reset() {
    router.push({ query: init });
  }

  onUnmounted(unsub);

  return { query, set, reset, update };
};

const createtBaseStore = <T extends object>(initial?: T) => {
  const _init = <Query<T>>processQuery({ page: 1, ...initial });
  const query = <Ref<Query<T>>>ref(structuredClone(_init));

  function set(newQuery: T): Query<T> {
    const nq = newQuery as Query<T>;
    nq.page ??= 1;
    return nq;
  }

  function update(newQuery: ModifiedQuery<T>): Query<T> {
    const result = Object.assign({ ...query.value }, newQuery);
    if (query.value.page < 0) delete (result as { page?: number }).page;
    return result;
  }

  function reset() {
    query.value = _init;
  }

  return { query, set, update, reset };
};

const processQuery = <T extends object>(query: T) =>
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
