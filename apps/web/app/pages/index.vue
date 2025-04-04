<script setup lang="ts">
import type { Post } from '@boorugator/shared/types';

import 'photoswipe/style.css';

import { Bean, CloudLightning, LoaderCircle } from 'lucide-vue-next';

const userConfig = useUserConfig();
const { data, error, loading, paginator } = useBooruFetch();

const post = shallowRef<Post>();
const container = shallowRef<HTMLElement>();

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

const { lightbox, opened } = useLightbox(container, {
  onClose: () => (post.value = undefined),
  onSlideChange: (s) => registerPost(s?.index),
  onLoadError({ content: { data }, slide }) {
    const el = data.element;
    const src = '/image/_/' + data.src;
    if (!(el instanceof HTMLAnchorElement) || data.proxied || el.dataset.proxied) return;
    el.dataset.pswpSrc = src;
    el.dataset.proxied = 'true';
    Object.assign(data, { src, proxied: true });
    slide.pswp.refreshSlideContent(slide.index);
  },
  onUiRegister: (pswp) =>
    pswp.ui?.registerElement({
      order: 9,
      name: 'action',
      className: 'pswp__button post-action !flex items-center justify-center text-white',
      onInit: (_, pswp) => nextTick(() => registerPost(pswp.currIndex)),
    }),
});
function registerPost(index?: number) {
  const virt = masonry.value?.virtualizer;
  if (!data.value || !virt || typeof index != 'number') return;
  const item = virt.getVirtualItems().at(index);
  if (item) post.value = data.value.post[item.index];
}

watch(data, () => masonry.value?.virtualizer.measure());
</script>

<template>
  <EmptyState
    v-if="error"
    class="py-8 px-4 h-[80dvh]"
    :title="`${error?.status === 503 ? 'Cloudflare' : 'Server'} Error`">
    <template #icon><CloudLightning /></template>
    <p>
      {{
        (error.statusMessage != 'Server Error' && error.statusMessage) ||
        'Something definitely wrong. Try refreshing this page.'
      }}
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
        <UtilMapObj :data="data.post" :fn="(p) => p[row.index]!" v-slot="item">
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

  <Teleport to=".post-action" v-if="opened">
    <PostContextTags :paginator v-model:post="post" @close="lightbox?.pswp?.close()" />
  </Teleport>
</template>

<style>
.pswp {
  z-index: 30 !important;
}
</style>
