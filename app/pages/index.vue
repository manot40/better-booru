<script setup lang="ts">
import type Masonry from 'masonry-layout';
import type { ListParams, Post } from '~~/types/common';

import 'photoswipe/style.css';

import { SquareArrowOutUpRight } from 'lucide-vue-next';

const COLUMNS = 'flex flex-wrap overflow-hidden p-2 lg:p-3 2xl:p-4 translate-x-1 lg:translate-x-1.5';

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

const masonry = shallowRef<Masonry>();
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
  const Masonry = await import('masonry-layout').then((m) => m.default);
  masonry.value = new Masonry(container.value, {
    columnWidth: '.item',
    itemSelector: '.item',
    percentPosition: true,
  });
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

watch(data, (_1, _2, onCleanup) => {
  if (masonry.value) masonry.value.destroy?.();
  createMasonry();
  onCleanup(() => {
    masonry.value?.destroy?.();
    masonry.value = undefined;
  });
});
</script>

<template>
  <div class="overflow-hidden">
    <div ref="container" :class="COLUMNS" class="mb-4">
      <template v-if="!data">
        <Skeleton
          v-for="_ in 20"
          class="item mb-2 md:mb-3 lg:mb-4 rounded-xl"
          :style="`height: ${randomInt(300, 600)}px`" />
      </template>
      <template v-else>
        <div
          :key="item.hash"
          v-for="(item, i) in data.post"
          class="item mb-2 md:mb-3 overflow-hidden rounded-xl">
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
      </template>

      <Teleport to=".pswp__open" v-if="rendered"><SquareArrowOutUpRight class="w-5 h-5 mx-auto" /></Teleport>
      <Teleport to=".bottom-bar"><PostFilter :count="data?.meta?.count" :paginator /></Teleport>
    </div>
  </div>
</template>

<style scoped>
.item {
  --margin: 0.5rem;
  width: calc(50% - 1rem);
}
.item:not(:nth-child(2n)) {
  margin-right: var(--margin);
}
@media (min-width: 1024px) {
  .item {
    --margin: 0.75rem;
    --offset: 1.25rem;
    width: calc(33.33% - var(--offset));
  }
  .item:not(:nth-child(3n)) {
    margin-right: var(--margin);
  }
}
@media (min-width: 1536px) {
  .item {
    width: calc(25% - var(--offset));
  }
  .item:not(:nth-child(4n)) {
    margin-right: var(--margin);
  }
}
</style>
