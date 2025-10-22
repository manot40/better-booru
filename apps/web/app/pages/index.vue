<script setup lang="ts">
import type { Post } from '@boorugator/shared/types';
import type { SlideData } from 'photoswipe';

import 'photoswipe/style.css';

import { Bean, CloudLightning, LoaderCircle } from 'lucide-vue-next';

const router = useRouter();
const userConfig = useUserConfig();
const { watcher: historyWatcher } = useBrowseHistory();

const masonry = useTemplateRef('masonry');
const scrollEl = computed(() => masonry.value?.el || undefined);

const post = shallowRef<Post>();
const container = shallowRef<HTMLElement>();
const slideData = useState('slide-data', () => shallowRef<SlideData[]>([]));

const { data, error, loading, paginator } = useBooruFetch(scrollEl, {
  onReset(post) {
    scrollTop();
    slideData.value = post.map(postToSlide);
  },
  onAppend(post) {
    const result = post.map(postToSlide);
    slideData.value = slideData.value.concat(result);
  },
});

watch(paginator.query, historyWatcher, { immediate: true });

const { lightbox, controlVisible } = useLightbox(slideData, {
  onSlideChange: (s) => s && registerPost(s.index),
  onBeforeInit(lightbox) {
    lightbox.addFilter('thumbEl', (thumb, _, i) => {
      const img = findElement(i);
      return img || (thumb as HTMLElement);
    });
    lightbox.addFilter('placeholderSrc', (src, { index: i }) => {
      const img = findElement(i);
      return img?.src || src;
    });
  },
  onLoadError({ content: { data }, slide }) {
    if (data.proxied || !data.src) return;
    const src = `/images/${btoa(data.src)}`;
    Object.assign(slide.data, { src, proxied: true });
    slide.pswp.refreshSlideContent(slide.index);
  },
  onClose() {
    if (location.hash.replace('#', '')) router.back();
    post.value = undefined;
  },
});

const gap = 6;
const estimateSize = createEstimateSize(data, container, gap);

function findElement(index: number) {
  const img = container.value?.querySelector(`[data-content-index="${index}"] img`);
  if (img instanceof HTMLImageElement) return img;
}

function handleTagChange(tags: string) {
  paginator.set({ page: 1, tags });
  scrollTop();
}

function openGallery(index: number) {
  registerPost(index);
  lightbox.value?.loadAndOpen(index);
}

function registerPost(index: number) {
  if (!data.value) return;
  post.value = data.value.post[index];
}

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

const unsubRouteListener = router.afterEach((to, from) => {
  const lbox = lightbox.value;
  const virt = masonry.value?.virtualizer;
  const items = data.value?.post;
  const isDiffHash = !!to.hash && to.hash !== from.hash;
  const isSameQuery = from?.query.tags === to.query.tags;

  if (!lbox || !virt || !items) return;

  nextTick(() => {
    if (!to.hash) return lbox.pswp?.close();
    if (isSameQuery && isDiffHash) {
      const id = to.hash.slice(1);
      const el = document.getElementById(id);
      if (el instanceof HTMLElement) {
        const index = +el.dataset.index!;
        post.value = items[index];
        el.click();
      }
    }
  });
});

onUnmounted(unsubRouteListener);
</script>

<template>
  <EmptyState
    v-if="error"
    class="py-8 px-4 h-[80dvh] mt-15"
    :title="`${error?.status === 503 ? 'Cloudflare' : 'Server'} Error`">
    <template #icon><CloudLightning /></template>
    <p>
      {{
        (error.status == 422 && (error.value.summary || error.value.message)) ||
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
    class="relative p-3 max-md:px-2 [&>div]:translate-y-14 h-dvh"
    v-else-if="data.post.length > 0">
    <template #default="{ row }">
      <div class="rounded-xl overflow-hidden shadow-sm border border-neutral-50 dark:border-transparent">
        <UtilMapObj :data="data.post" :fn="(p) => p[row.index]!" v-slot="item">
          <PostListItemImage
            :item
            :data-index="row.key"
            @click="openGallery(row.index)"
            v-if="!['webm', 'mp4', 'zip'].includes(item.file_ext)" />
          <PostListItemVideo :item :data-index="row.key" v-else />
        </UtilMapObj>
      </div>
    </template>
    <template #end>
      <div
        v-if="!userConfig.isInfinite"
        :data-show="top < 300 || isBottom || scrollUp"
        class="bottom-bar flex sticky z-30 bottom-14 my-4">
        <Card
          class="!flex justify-between items-center p-2 gap-2 max-w-lg mx-auto bg-card/80 backdrop-blur-lg">
          <PostFilter :count="data.meta.count" :paginator @scroll-top="scrollTop" />
        </Card>
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
        @changeTag="handleTagChange" />
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
