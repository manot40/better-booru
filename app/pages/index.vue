<script setup lang="ts">
import type { ListParams, Post } from '~~/types/common';

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

function reduceSize(item: Post): [string, number, number] {
  const src = item.sample_url || item.file_url;
  const width = item.sample_width || item.width;
  const height = item.sample_height || item.height;

  const square = width * height;
  const division = square > 2_000_000 ? 3 : square > 1_000_000 ? 2 : 1;
  return [src, Math.round(width / division), Math.round(height / division)];
}

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
        <NuxtLink
          external
          target="_blank"
          class="ps__item"
          data-cropped="true"
          :id="item.id"
          :data-pswp-src="item.file_url"
          :data-pswp-width="item.width"
          :data-pswp-height="item.height"
          :to="createBooruURL(item.id)">
          <UtilMapObj :data="item" :fn="reduceSize" v-slot="{ result: [src, width, height] }">
            <NuxtImg
              :src
              :width
              :height
              :key="item.hash"
              :alt="item.tags"
              :loading="i > 20 ? 'lazy' : 'eager'"
              :data-hires="item.file_url"
              class="w-full transition-all duration-200" />
          </UtilMapObj>
        </NuxtLink>
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
