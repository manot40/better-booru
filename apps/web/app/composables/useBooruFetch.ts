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

  const ids = useState('booru-fetch-ids', () => shallowRef(new Set<number>()));
  const data = useState('booru-fetch-data', () => shallowRef<Result>());
  const error = useState('booru-fetch-error', () => shallowRef<FetchError>());

  const hasNext = ref(true);
  const loading = ref(false);
  const noUpdate = ref(false);

  function changePage(page: number, replace = false) {
    noUpdate.value = true;
    paginator.update({ page }, replace);
  }
  function dedupe(postList: Post[]) {
    const filtered = postList.filter((post) => !ids.value.has(post.id));
    postList.forEach((p) => ids.value.add(p.id));
    triggerRef(ids);
    return filtered;
  }
  async function fetchBooru(state?: InfiScrollState, reset = false as boolean | 'only-data') {
    if (import.meta.server || (state && !config.isInfinite)) return;
    type PageAsString = Omit<ListParams, 'page'> & { page: string | number };

    const query = <PageAsString>{
      ...paginator.query.value,
    };

    if (reset) {
      data.value = undefined;
      if (reset === true) query.page = 1;
      else paginator.update({ reset: undefined }, true);
    } else if (config.isInfinite) {
      query.limit = LIMIT;
      if (!data.value) {
        query.page ||= 1;
      } else if (config.provider == 'danbooru') {
        const isAsc = query.page.toString().startsWith('a');
        query.page = `${isAsc ? 'a' : 'b'}${data.value.post.at(-1)?.id}`;
      } else if (typeof query.page == 'number') {
        query.page++;
      } else {
        query.page = 1;
      }
    }

    loading.value = true;
    const { data: res, error: err } = await eden.api.posts.get({ query });
    loading.value = false;

    if (!res || err) {
      error.value = err;
      hasNext.value = loading.value = false;
      return;
    }

    // Set new base url for preview urls
    res.post.forEach((post) => {
      post.preview_url &&= new URL(post.preview_url, getBaseURL()).toString();
    });

    // Infinte scroll disabled or initial state
    if (!config.isInfinite || !data.value) {
      data.value = res as Result;
      ids.value = new Set(...res.post.map((p) => ids.value.add(p.id)));
      options?.onReset?.(res.post as Post[]);
      if (reset === true) changePage(1);
      return (error.value = undefined);
    }

    const deduped = dedupe(res.post as Post[]);
    if (!deduped.length) return;

    error.value = undefined;
    data.value = { meta: res.meta, post: data.value.post.concat(deduped) };
    options?.onAppend?.(deduped);

    const isNotEmpty = (hasNext.value = res.post.length > 0);
    if (isNotEmpty) changePage(<number>query.page, true);
  }

  watchDebounced(noUpdate, () => (noUpdate.value &&= false), { debounce: 1000 });

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
    const isReset = a.reset === 'only-data' ? 'only-data' : !isEqual(restA, restB);

    fetchBooru(undefined, isReset);
  }, 200);
  watch(paginator.query, onQueryUpdate, { immediate: true });

  return { data, loading, error, hasNext, paginator };
};

type ScrollViewport = HTMLElement | SVGElement | Window | Document | null | undefined;

type Options = {
  onReset?: (data: Post[]) => void;
  onAppend?: (data: Post[]) => void;
};

type Result = {
  post: Post[];
  meta: BooruMeta;
};

type FetchError = {
  status: number;
  value: {
    on: string;
    type: string;
    found?: unknown;
    summary?: string;
    message?: string;
    property?: string;
    expected?: string;
  };
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
