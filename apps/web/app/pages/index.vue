<script setup lang="ts">
import type { Post } from '@boorugator/shared/types';
import type { SlideData } from 'photoswipe';

import 'photoswipe/style.css';

import { Bean, CloudLightning, LoaderCircle } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const userConfig = useUserConfig();

const masonry = useTemplateRef('masonry');
const scrollEl = computed(() => masonry.value?.el || undefined);

const post = shallowRef<Post>();
const container = shallowRef<HTMLElement>();
const { data, error, loading, paginator } = useBooruFetch(scrollEl);

const canBack = ref(false);
const slideData = computed<SlideData[]>(() => {
  if (!data.value) return [];
  return data.value.post.map((item) => ({
    src: item.file_url,
    width: item.width,
    height: item.height,
    get msrc() {
      return getThumbElement()?.src;
    },
    get element() {
      return getThumbElement();
    },
  }));
});

const gap = 6;
function estimateSize(index: number, lane: number) {
  const item = data.value?.post[index];
  if (!item) return 0;

  const [x, y] = imageAspectRatio(item.width, item.height);
  const spacer = lane === 1 ? 0 : gap * lane;
  const elWidth = (container.value?.clientWidth || window.innerWidth) - spacer;
  const relWidth = +(elWidth / lane) / x;
  const relHeight = relWidth * y + 2;

  return relHeight > 900 ? 900 : relHeight;
}

function getThumbElement() {
  const index = lightbox.value?.pswp?.currIndex;
  const img = container.value?.querySelector(`[data-content-index="${index}"] img`);
  if (img instanceof HTMLImageElement) return img;
}

function registerPost(index?: number) {
  const virt = masonry.value?.virtualizer;
  if (!data.value || !virt || typeof index != 'number') return;

  const item = virt.getVirtualItems().at(index);

  if (item) {
    canBack.value = true;
    post.value = data.value.post[item.index];
  }
}

const { lightbox, controlVisible } = useLightbox(slideData, {
  onUiRegister: (pswp) => registerPost(pswp.currIndex),
  onSlideChange: (s) => registerPost(s?.index),
  onLoadError({ content: { data }, slide }) {
    if (data.proxied) return;
    const src = '/image/_/' + data.src;
    Object.assign(data, { src, proxied: true });
    slide.pswp.refreshSlideContent(slide.index);
  },
  onClose() {
    post.value = undefined;

    if (canBack.value) {
      router.back();
      canBack.value = false;
    } else {
      navigateTo({ query: route.query });
    }
  },
});

const { top, scrollUp, isBottom } = useScrollDirection(100, scrollEl);
watch([top, scrollUp], ([top, up]) => {
  const nav = document.querySelector('.nav-root');
  if (nav instanceof HTMLElement) {
    const onTop = top < 300;
    nav.dataset.show = (onTop || up).toString();
  }
});

watch(data, () => masonry.value?.virtualizer.measure());
const scrollTop = () => scrollEl.value?.scrollTo({ top: 0, behavior: 'instant' });

const routeListener = router.afterEach((to, from) => {
  const lbox = lightbox.value;
  const virt = masonry.value?.virtualizer;
  const items = data.value?.post;
  if (!lbox || !virt || !items) return;

  canBack.value = false;

  if (!to.hash) lbox.pswp?.close();
  else if (to.hash !== from.hash && to.hash) {
    const id = to.hash.slice(1);
    if (id.includes('detail')) return;
    const el = document.getElementById(id);
    if (el instanceof HTMLElement) {
      const index = +el.dataset.index!;
      post.value = items[index];
      el.click();
    }
  }
});

onUnmounted(routeListener);
</script>

<template>
  <EmptyState
    v-if="error"
    class="py-8 px-4 h-[80dvh] mt-15"
    :title="`${error?.status === 503 ? 'Cloudflare' : 'Server'} Error`">
    <template #icon><CloudLightning /></template>
    <p>
      {{
        (error.statusMessage != 'Server Error' && error.statusMessage) ||
        'Something definitely wrong. Try refreshing this page.'
      }}
    </p>
  </EmptyState>
  <PostListSkeleton v-else-if="!data" class="mt-14" />
  <VirtualMasonry
    :gap
    :estimateSize
    :count="data.post.length"
    :containerRef="(el) => (container = <HTMLElement>el)"
    id="post-list"
    ref="masonry"
    class="relative overflow-y-auto overflow-x-hidden p-3 max-md:px-2 [&>div]:translate-y-14 h-dvh"
    v-else-if="data.post.length > 0">
    <template #default="{ row }">
      <div class="rounded-xl overflow-hidden shadow-sm border border-neutral-50 dark:border-transparent">
        <UtilMapObj :data="data.post" :fn="(p) => p[row.index]!" v-slot="item">
          <PostListItemImage
            :item
            :data-index="row.key"
            @click="lightbox?.loadAndOpen(row.index)"
            v-if="!['webm', 'mp4'].includes(item.file_ext)" />
          <PostListItemVideo :item :data-index="row.key" v-else />
        </UtilMapObj>
      </div>
    </template>
    <template #end>
      <div
        v-if="!userConfig.isInfinite"
        :data-show="top < 300 || isBottom || scrollUp"
        class="bottom-bar flex sticky z-30 bottom-14 my-4">
        <PostFilter :count="data.meta.count" :paginator @scroll-top="scrollTop" />
      </div>
      <EmptyState class="py-8 px-4" v-else-if="loading">
        <template #icon><LoaderCircle class="animate-spin !w-10 !h-10 !mb-3" /></template>
        <p class="text-sm">Loading more image for you...</p>
      </EmptyState>
    </template>
  </VirtualMasonry>
  <EmptyState title="Nothing Found" class="py-8 px-4 h-[80dvh] mt-14" v-else>
    <template #icon><Bean /></template>
    <p>Try search for something else or readjust your tags.</p>
  </EmptyState>

  <div class="fixed bottom-8 z-50 left-1/2 -translate-x-1/2">
    <Transition name="slide-in-out">
      <PostContext
        :post
        v-if="post"
        v-show="controlVisible"
        @close="lightbox?.pswp?.close()"
        @changeTag="(paginator.set({ page: 1, tags: $event }), scrollTop())" />
    </Transition>
  </div>
</template>

<style>
.pswp {
  z-index: 30 !important;
}
.bottom-bar {
  transform: translate3d(0, 0%, 0);
  transition: all 0.5s cubic-bezier(0.1, 0.9, 0.2, 1);
}
.bottom-bar[data-show='false'] {
  transform: translate3d(0, 140%, 0);
}
</style>
