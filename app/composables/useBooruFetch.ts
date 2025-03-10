import type { FetchError } from 'ofetch';
import type { ListParams, Post, BooruMeta } from '~~/types/common';

type BooruResult = {
  post: Ref<Post[] | undefined>;
  meta: Ref<BooruMeta | undefined>;
  error: Ref<FetchError | undefined>;
  loading: Ref<boolean>;
  paginator: UsePagination<ListParams>;
};

type ScrollViewport = MaybeRefOrGetter<Window | HTMLElement | null | undefined>;

function dedupe(oldList: Post[], newList: Post[]) {
  const oldIds = oldList.map(({ id }) => id);
  return newList.filter((post) => !oldIds.includes(post.id));
}

export const useBooruFetch = (el = (() => window) as ScrollViewport): BooruResult => {
  const config = useUserConfig();
  const paginator = usePaginationQuery<ListParams>();
  const { workerFn } = useWebWorkerFn(dedupe);

  useInfiniteScroll(el, useThrottleFn(fetchBooru, 3000), {
    distance: 1200,
    canLoadMore: () => canNext.value,
  });

  const post = shallowRef<Post[]>();
  const meta = shallowRef<BooruMeta>();
  const error = shallowRef<FetchError>();

  const canNext = ref(true);
  const loading = ref(false);
  const noFetch = ref(false);

  async function fetchBooru(state?: InfiScrollState, reset = false) {
    if (reset) paginator.reset();

    type PageAsString = Omit<ListParams, 'page'> & { page: string | number };
    const query = <PageAsString>{ ...paginator.query.value, limit: 25 };
    const headers = {
      'x-rating': config.rating?.join(' ') || '',
      'x-provider': config.provider,
    };

    if (noFetch.value || (state && !config.isInfinite)) return;
    if (config.isInfinite) {
      if (!post.value) query.page ||= 1;
      else query.page = `b${post.value.at(-1)!.id}`;
    }

    loading.value = true;
    const promise = $fetch<{ post: Post[]; meta: BooruMeta }>('/api/post', { query, headers });
    const { data: res, error: err } = await unwrapPromise(promise);
    loading.value = false;

    if (!res || err) {
      error.value = <FetchError>err;
      return;
    }

    // Infinte scroll disabled or initial state
    if (!config.isInfinite || !post.value || reset) {
      post.value = res.post;
      meta.value = res.meta;
      return;
    }

    const deduped = await workerFn(post.value, res.post);
    if (!deduped.length) return;

    meta.value = res.meta;
    post.value = post.value.concat(deduped);
    if ((canNext.value = res.post.length > 0)) {
      noFetch.value = true;
      paginator.update({ page: <number>query.page }, true);
    }
  }

  function checkForUpdate(a: ListParams, b?: ListParams) {
    if (noFetch.value) return (noFetch.value = false);
    if (typeof b == 'undefined') return fetchBooru();
    else if (deepCompare(a, b)) return;

    const { page: _1, ...restA } = a;
    const { page: _2, ...restB } = b;
    fetchBooru(undefined, Object.values(restA).join('') !== Object.values(restB).join(''));
  }

  watch(paginator.query, checkForUpdate, { immediate: true });
  watch([() => `${config.provider}-${config.isInfinite}-${config.rating}`], () => {
    post.value &&= undefined;
    fetchBooru();
  });

  return { post, meta, loading, error, paginator };
};

type InfiScrollState = {
  x: number;
  y: number;
  measure(): void;
  isScrolling: boolean;
  directions: DirectionState;
  arrivedState: DirectionState;
};

type DirectionState = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};
