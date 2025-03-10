import type { FetchError } from 'ofetch';
import type { ListParams, Post, BooruMeta } from '~~/types/common';

import { debounce } from 'perfect-debounce';

type BooruResult = {
  post: Ref<Post[] | undefined>;
  meta: Ref<BooruMeta | undefined>;
  error: Ref<FetchError | undefined>;
  loading: Ref<boolean>;
  paginator: UsePagination<ListParams>;
};

type ScrollViewport = MaybeRefOrGetter<Window | HTMLElement | null | undefined>;

export const useBooruFetch = (el = (() => window) as ScrollViewport): BooruResult => {
  const userConfig = useUserConfig();
  const paginator = usePaginationQuery<ListParams>();

  useInfiniteScroll(el, debounce(fetchBooru, 200), {
    distance: 500,
    canLoadMore: () => canNext.value,
  });

  const post = shallowRef<Post[]>();
  const meta = shallowRef<BooruMeta>();
  const error = shallowRef<FetchError>();

  const canNext = ref(true);
  const loading = ref(false);
  const noFetch = ref(false);

  async function fetchBooru(state?: InfiScrollState, reset = false) {
    const query = { ...paginator.query.value };
    const headers = {
      'x-rating': userConfig.rating?.join(' ') || '',
      'x-provider': userConfig.provider,
    };

    if (noFetch.value || (state && !userConfig.isInfinite)) return;

    if (userConfig.isInfinite) {
      // @ts-ignore
      query.page = !reset && post.value ? `b${post.value.at(-1)!.id}` : query.page;
    }

    loading.value = true;
    const promise = $fetch<{ post: Post[]; meta: BooruMeta }>('/api/post', { query, headers });
    const { data: res, error: err } = await unwrapPromise(promise);
    loading.value = false;

    if (!res || err) {
      error.value = <FetchError>err;
      return;
    }

    if (userConfig.isInfinite) {
      meta.value = res.meta;
      if (!post.value || reset) {
        post.value = res.post;
      } else {
        const next = (canNext.value = res.post.length > 0);
        post.value = post.value?.concat(res.post);
        if (next) {
          noFetch.value = true;
          paginator.update({ page: query.page }, true);
        }
      }
    } else {
      post.value = res.post;
      meta.value = res.meta;
    }
  }

  function checkForUpdate(a: ListParams, b?: ListParams) {
    if (noFetch.value) return (noFetch.value = false);
    if (typeof b == 'undefined') return fetchBooru();
    const { page: _1, ...restA } = a;
    const { page: _2, ...restB } = b;
    fetchBooru(undefined, Object.values(restA).join('') !== Object.values(restB).join(''));
  }

  const cfg = () => `${userConfig.provider}-${userConfig.isInfinite}-${userConfig.rating}`;
  watch(cfg, () => fetchBooru());
  watch(paginator.query, checkForUpdate, { immediate: true });

  return { post, meta, loading, error, paginator };
};

type InfiScrollState = {
  x: number;
  y: number;
  measure(): void;
  isScrolling: boolean;
  arrivedState: {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
  };
  directions: {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
  };
};
