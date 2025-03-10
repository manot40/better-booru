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
    distance: 800,
    canLoadMore: () => canNext.value && !noUpdate.value,
  });

  const post = shallowRef<Post[]>();
  const meta = shallowRef<BooruMeta>();
  const error = shallowRef<FetchError>();

  const canNext = ref(true);
  const loading = ref(false);
  const noUpdate = ref(false);

  function resetPage(page: number) {
    noUpdate.value = true;
    paginator.update({ page }, true);
  }
  async function fetchBooru(state?: InfiScrollState, reset?: boolean) {
    type PageAsString = Omit<ListParams, 'page'> & { page: string | number };
    const query = <PageAsString>{ ...paginator.query.value, limit: 30 };

    if (reset) query.page = 1;
    const headers = {
      'x-rating': config.rating?.join(' ') || '',
      'x-provider': config.provider,
    };

    if (state && !config.isInfinite) return;
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
      if (reset) resetPage(1);
      return;
    }

    const a = [post.value, res.post] as const;
    const deduped = post.value.length > 300 ? await workerFn(...a) : dedupe(...a);
    if (!deduped.length) return;

    meta.value = res.meta;
    post.value = post.value.concat(deduped);
    if ((canNext.value = res.post.length > 0)) resetPage(<number>query.page);
  }

  const checkForUpdate = useThrottleFn((a: ListParams, b?: ListParams) => {
    if (noUpdate.value) return (noUpdate.value = false);
    if (typeof b == 'undefined') return fetchBooru();
    else if (deepCompare(a, b)) return;

    const { page: _1, ...restA } = a;
    const { page: _2, ...restB } = b;
    fetchBooru(undefined, !deepCompare(restA, restB));
  }, 200);

  watch(paginator.query, checkForUpdate, { immediate: true });
  watch([() => `${config.provider}-${config.isInfinite}-${config.rating}`], () => {
    post.value &&= undefined;
    noUpdate.value = true;
    fetchBooru(undefined, true);
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
