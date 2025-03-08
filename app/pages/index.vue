<script setup lang="ts">
import type { ListParams } from '~~/types/common';

import 'photoswipe/style.css';

import { SquareArrowOutUpRight } from 'lucide-vue-next';

definePageMeta({
  middleware() {
    const nuxt = useNuxtApp();
    const ucfg = useUserConfig();
    if (import.meta.server || nuxt.isHydrating) ucfg.populate();
  },
});

const userConfig = useUserConfig();

const headers = computed(() => ({
  'x-rating': userConfig.rating?.join(' ') || '',
  'x-provider': userConfig.provider,
}));
const paginator = usePaginationQuery<ListParams>();
const { data } = useLazyFetch('/api/post', { server: false, query: paginator.query, headers });

const masonry = shallowRef<import('masonry-layout')>();
const container = useTemplateRef('container');
const { lightbox, rendered } = useLightbox(container);

async function createMasonry() {
  if (!container.value) return;
  const { default: Masonry } = await import('masonry-layout');
  const masonry_ = (masonry.value = new Masonry(container.value, {
    initLayout: true,
    columnWidth: '.item',
    itemSelector: '.item',
    percentPosition: true,
    horizontalOrder: true,
  }));
  masonry_.layout?.();
  return masonry_;
}

onMounted(() => {
  createMasonry();
  lightbox.value?.on('loadError', function ({ content, slide }) {
    const el = <HTMLAnchorElement>content.data.element;
    const src = '/image?proxy=' + content.data.src;
    if (content.data.proxied || el.dataset.proxied) return;

    el.dataset.pswpSrc = src;
    el.dataset.proxied = 'true';
    content.data = { ...content.data, src, proxied: true };
    slide.pswp.refreshSlideContent(slide.index);
  });
});

watch([data, () => userConfig.column], (_1, _2, onCleanup) => {
  if (masonry.value) masonry.value.destroy?.();
  createMasonry();
  onCleanup(() => {
    masonry.value?.destroy?.();
    masonry.value = undefined;
  });
});
</script>

<template>
  <div class="root">
    <div ref="container" class="boorus" :data-column="userConfig.column">
      <template v-if="!data">
        <Skeleton
          v-for="_ in 20"
          class="item mb-2 md:mb-3 lg:mb-4 rounded-xl"
          :style="`height: ${randomInt(300, 600)}px`" />
      </template>

      <div :key="item.hash" class="item overflow-hidden rounded-xl" v-for="(item, i) in data.post" v-else>
        <PostListItemImage :item :index="i" v-if="!['webm', 'mp4'].includes(item.file_ext)" />
        <PostListItemVideo :item v-else />
      </div>

      <Teleport to=".pswp__open" v-if="rendered"><SquareArrowOutUpRight class="w-5 h-5 mx-auto" /></Teleport>
      <Teleport to=".bottom-bar"><PostFilter :count="data?.meta?.count" :paginator /></Teleport>
    </div>
  </div>
</template>

<style scoped>
.root {
  @apply overflow-hidden px-1 lg:px-2 mt-1.5 lg:mt-3;
}
.boorus {
  @apply flex flex-wrap overflow-hidden;
}

/** 1 Columns Preset */
.boorus[data-column='1'] .item {
  width: calc(100% - var(--margin)) !important;
}

/** 2 Columns Preset */
.boorus[data-column='2'] .item {
  width: calc(50% - var(--margin)) !important;
}
/* @default */
.item {
  --margin: 0.5rem;
  --x-margin: calc(var(--margin) / 2);
  width: calc(50% - var(--margin));
  margin: 0 var(--x-margin) var(--margin) var(--x-margin);
}

/** 3 Columns Preset */
.boorus[data-column='3'] .item {
  width: calc(33.333% - var(--margin)) !important;
}
/* @default */
@media (min-width: 1024px) {
  .item {
    --margin: 0.75rem;
    width: calc(33.333% - var(--margin));
  }
}

/** 4 Columns Preset */
.boorus[data-column='4'] .item {
  width: calc(25% - var(--margin)) !important;
}
/* @default */
@media (min-width: 1536px) {
  .item {
    width: calc(25% - var(--margin));
  }
}
</style>
