import type { FetchError } from 'ofetch';
import type { ListParams, Post, BooruMeta } from '@boorugator/shared/types';

import { isEqual } from 'ohash';

const LIMIT = 50;

export const useBooruFetch = (
  el = (() => window) as MaybeRefOrGetter<ScrollViewport>,
  options?: Options
): BooruResult => {
  const config = useUserConfig();
  const paginator = usePaginationQuery<ListParams>();

  useInfiniteScroll(el, useThrottleFn(fetchBooru, 3000), {
    distance: 800,
    canLoadMore: () => hasNext.value && !noUpdate.value && !loading.value,
  });

  const data = useState('booru-fetch-data', () => shallowRef<Result>());
  const error = useState('booru-fetch-error', () => shallowRef<FetchError>());

  const hasNext = ref(true);
  const loading = ref(false);
  const noUpdate = ref(false);

  function changePage(page: number, replace = false) {
    noUpdate.value = true;
    paginator.update({ page }, replace);
  }
  async function fetchBooru(state?: InfiScrollState, reset?: boolean) {
    if (import.meta.server || (state && !config.isInfinite)) return;
    type PageAsString = Omit<ListParams, 'page'> & { page: string | number };

    const query = <PageAsString>{
      ...paginator.query.value,
    };
    const headers = {
      'x-rating': config.rating?.join(' ')!,
      'x-provider': config.provider,
    };

    if (reset) {
      query.page = 1;
    } else if (config.isInfinite) {
      query.limit = LIMIT;
      if (!data.value) query.page ||= 1;
      else if (config.provider == 'danbooru') query.page = `b${data.value.post.at(-1)!.id}`;
      else if (typeof query.page == 'number') query.page++;
      else query.page = 1;
    }

    loading.value = true;
    const { data: res, error: err } = await eden.api.posts.get({ query, headers });
    loading.value = false;

    if (!res || err) {
      error.value = <FetchError>err;
      hasNext.value = loading.value = false;
      return;
    }

    // Infinte scroll disabled or initial state
    if (!config.isInfinite || !data.value || reset) {
      data.value = res;
      options?.onReset?.(res.post);
      if (reset) changePage(1);
      return (error.value = undefined);
    }

    const sliceAmt = Math.floor(LIMIT * -(data.value.post.length > LIMIT ? 2 : 1));
    const deduped = dedupe(data.value.post.slice(sliceAmt), res.post);
    if (!deduped.length) return;

    error.value = undefined;
    data.value = { meta: res.meta, post: data.value.post.concat(deduped) };
    options?.onAppend?.(deduped);

    const isNotEmpty = (hasNext.value = res.post.length > 0);
    if (isNotEmpty) changePage(<number>query.page, true);
  }

  const debOpts = { debounce: 3000 };
  watchDebounced(noUpdate, () => (noUpdate.value &&= false), debOpts);

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

type ScrollViewport = HTMLElement | SVGElement | Window | Document | null | undefined;

type Options = {
  onReset?: (data: Post[]) => void;
  onAppend?: (data: Post[]) => void;
};

type Result = {
  post: Post[];
  meta: BooruMeta;
};

type InfiScrollState = {
  x: number;
  y: number;
  measure(): void;
  isScrolling: boolean;
  directions: DirectionState;
  arrivedState: DirectionState;
};

export interface BooruResult {
  data: Ref<Result | undefined>;
  error: Ref<FetchError | undefined>;
  hasNext: Ref<boolean>;
  loading: Ref<boolean>;
  paginator: UsePagination<ListParams>;
}

type DirectionState = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};
