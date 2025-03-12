<script setup lang="ts">
import type { EventCallback } from 'photoswipe/lightbox';

import 'photoswipe/style.css';

import { Bean, CloudLightning, LoaderCircle, SquareArrowOutUpRight } from 'lucide-vue-next';

definePageMeta({
  middleware() {
    const nuxt = useNuxtApp();
    const ucfg = useUserConfig();
    if (import.meta.server || nuxt.isHydrating) ucfg.populate();
  },
});

const userConfig = useUserConfig();
const { data, error, loading, paginator } = useBooruFetch();

const container = shallowRef<HTMLElement>();
const { lightbox, rendered } = useLightbox(container);

const gap = 8;
const masonry = useTemplateRef('masonry');
function estimateSize(index: number, lane: number) {
  const item = data.value?.post[index];
  if (!item) return 0;

  const [x, y] = imageAspectRatio(item.width, item.height);
  const widthPerLane = +(window.innerWidth / lane) - gap;
  const relWidth = widthPerLane / x;
  const relHeight = Math.round(relWidth * y);

  return relHeight > 900 ? 900 : relHeight;
}

watch(data, () => masonry.value?.virtualizer.measure());

watch(lightbox, (lightbox, _, onCleanup) => {
  if (!lightbox) return;
  onLightboxErr.bind(lightbox.pswp);
  lightbox?.on('loadError', onLightboxErr);
  onCleanup(() => lightbox?.off('loadError', onLightboxErr));
});

const onLightboxErr: EventCallback<'loadError'> = ({ content: { data }, slide }) => {
  const el = data.element;
  const src = '/image?proxy=' + data.src;
  if (!(el instanceof HTMLAnchorElement) || data.proxied || el.dataset.proxied) return;

  el.dataset.pswpSrc = src;
  el.dataset.proxied = 'true';
  Object.assign(data, { src, proxied: true });
  slide.pswp.refreshSlideContent(slide.index);
};
</script>

<template>
  <EmptyState
    v-if="error"
    class="py-8 px-4 h-[80dvh]"
    :title="`${error?.status === 503 ? 'Cloudflare' : 'Server'} Error`">
    <template #icon><CloudLightning /></template>
    <p>
      {{ error.statusMessage || 'Something definitely wrong. Try refreshing this page.' }}
    </p>
  </EmptyState>
  <PostListSkeleton v-else-if="!data" />
  <VirtualMasonry
    :gap
    :estimateSize
    :count="data.post.length"
    :containerRef="(el) => (container = <HTMLElement>el)"
    ref="masonry"
    class="overflow-auto px-1 lg:px-2 mt-1.5 lg:mt-3"
    v-else-if="data.post.length > 0">
    <template #default="{ row }">
      <div class="rounded-xl overflow-hidden shadow-sm border border-neutral-50 dark:border-transparent">
        <UtilMapObj :data="data.post" :fn="(p) => p[row.index]!" v-slot="{ result: item }">
          <PostListItemImage :item v-if="!['webm', 'mp4'].includes(item.file_ext)" />
          <PostListItemVideo :item v-else />
        </UtilMapObj>
      </div>
    </template>
  </VirtualMasonry>
  <EmptyState title="Nothing Found" class="py-8 px-4 h-[80dvh]" v-else>
    <template #icon><Bean /></template>
    <p>Try search for something else or readjust your tags.</p>
  </EmptyState>

  <template v-if="data?.post.length">
    <Teleport to=".bottom-bar" v-if="!userConfig.isInfinite">
      <PostFilter :count="data.meta.count" :paginator />
    </Teleport>
    <EmptyState class="py-8 px-4" v-else-if="loading">
      <template #icon><LoaderCircle class="animate-spin !w-10 !h-10 !mb-3" /></template>
      <p class="text-sm">Loading more image for you...</p>
    </EmptyState>
  </template>

  <Teleport to=".pswp__open" v-if="rendered"><SquareArrowOutUpRight class="w-5 h-5 mx-auto" /></Teleport>
</template>
