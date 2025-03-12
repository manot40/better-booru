import type { FetchError } from 'ofetch';
import type { ListParams, Post, BooruMeta } from '~~/types/common';

import { isEqual } from 'ohash';

const LIMIT = 50;

export const useBooruFetch = (el = (() => window) as ScrollViewport): BooruResult => {
  const config = useUserConfig();
  const paginator = usePaginationQuery<ListParams>();

  useInfiniteScroll(el, useThrottleFn(fetchBooru, 3000), {
    distance: 800,
    canLoadMore: () => hasNext.value && !noUpdate.value && !loading.value,
  });

  const data = shallowRef<Result>();
  const error = shallowRef<FetchError>();

  const hasNext = ref(true);
  const loading = ref(false);
  const noUpdate = ref(false);

  function resetPage(page: number, replace = false) {
    noUpdate.value = true;
    paginator.update({ page }, replace);
  }
  async function fetchBooru(state?: InfiScrollState, reset?: boolean) {
    if (import.meta.server || (state && !config.isInfinite)) return;
    type PageAsString = Omit<ListParams, 'page'> & { page: string | number };

    const query = <PageAsString>{ ...paginator.query.value };
    const headers = { 'x-rating': config.rating?.join(' ')!, 'x-provider': config.provider };
    if (reset) {
      query.page = 1;
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (config.isInfinite) {
      query.limit = LIMIT;
      if (!data.value) query.page ||= 1;
      else if (config.provider == 'danbooru') query.page = `b${data.value.post.at(-1)!.id}`;
      else if (typeof query.page == 'number') query.page++;
      else query.page = 1;
    }

    loading.value = true;
    const promise = $fetch<{ post: Post[]; meta: BooruMeta }>('/api/post', { query, headers });
    const { data: res, error: err } = await unwrapPromise(promise);
    loading.value = false;

    if (!res || err) {
      error.value = <FetchError>err;
      hasNext.value = loading.value = false;
      return;
    }

    // Infinte scroll disabled or initial state
    if (!config.isInfinite || !data.value || reset) {
      data.value = res;
      if (reset) resetPage(1);
      return (error.value = undefined);
    }

    const sliceAmt = Math.floor(LIMIT * -(data.value.post.length > LIMIT ? 2 : 1));
    const deduped = dedupe(data.value.post.slice(sliceAmt), res.post);
    if (!deduped.length) return;

    error.value = undefined;
    data.value = { meta: res.meta, post: data.value.post.concat(deduped) };
    if ((hasNext.value = res.post.length > 0)) resetPage(<number>query.page, true);
  }

  const onConfigUpdate = () => {
    data.value &&= undefined;
    noUpdate.value = true;
    fetchBooru(undefined, true);
  };
  watch(() => config.nonce, onConfigUpdate);

  const onQueryUpdate = useThrottleFn((a: ListParams, b?: ListParams) => {
    if (noUpdate.value) return (noUpdate.value = false);
    if (typeof b == 'undefined' || !config.isInfinite) return fetchBooru();

    if (isEqual(a, b)) return;
    const { page: _1, ...restA } = a;
    const { page: _2, ...restB } = b;
    fetchBooru(undefined, !isEqual(restA, restB));
  }, 200);
  watch(paginator.query, onQueryUpdate, { immediate: true });

  return { data, loading, error, hasNext, paginator };
};

function dedupe(oldList: Post[], newList: Post[]) {
  const oldIds = oldList.map(({ id }) => id);
  return newList.filter((post) => !oldIds.includes(post.id));
}

type Result = { post: Post[]; meta: BooruMeta };
type ScrollViewport = MaybeRefOrGetter<Window | HTMLElement | null | undefined>;
export interface BooruResult {
  data: Ref<Result | undefined>;
  error: Ref<FetchError | undefined>;
  hasNext: Ref<boolean>;
  loading: Ref<boolean>;
  paginator: UsePagination<ListParams>;
}

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
