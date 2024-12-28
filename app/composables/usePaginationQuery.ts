import type { LocationQuery } from 'vue-router';

type Query<T extends object> = T & { page: number };
type ModifiedQuery<T extends object> = Partial<Query<T>> & Record<string, Primitive>;

export interface UsePagination<T extends object> {
  query: Ref<Query<T>>;
  set: (newQuery: Query<T>) => void;
  reset: () => void;
  update: (newQuery: ModifiedQuery<T>) => void;
  getTotalPage: (count: number, perPage: number) => number;
}

export const usePaginationQuery = <T extends object>(initial = {} as Query<T>): UsePagination<T> => {
  const route = useRoute();
  const router = useRouter();

  // @ts-ignore
  const _init = processQuery({ page: 1, ...initial, ...route.query });
  const query = <Ref<Query<T>>>ref(structuredClone(_init));

  const unsub = router.afterEach((to, from) => {
    if (to.path !== from.path) return;

    /** When router query empty, fallback to initial query state */
    if (!Object.keys(to.query).length) {
      query.value = _init;
      return;
    }

    const processed = processQuery(to.query);
    query.value = processed as T & { page: number };
  });

  function set(newQuery: T) {
    const nq = newQuery as { page: number };
    nq.page ??= 1;
    const query = nq as unknown as LocationQuery;
    router.push({ query });
  }

  function reset() {
    router.push({ query: _init });
  }

  function update(newQuery: ModifiedQuery<T>) {
    const result = Object.assign({ ...query.value }, newQuery);
    if (query.value.page < 0) delete (result as { page?: number }).page;
    router.push({ query: result });
  }

  function getTotalPage(count: number, perPage: number) {
    return Math.ceil(count / perPage) || 1;
  }

  onUnmounted(unsub);

  return { query, set, reset, update, getTotalPage };
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
