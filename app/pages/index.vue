<script setup lang="ts">
import type { BooruData, BooruParams } from '~~/types/booru';

import 'photoswipe/style.css';

import PhotoSwipeLightbox from 'photoswipe/lightbox';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const COLUMNS = 'columns-2 md:columns-3 xl:columns-4 gap-x-2 md:gap-x-3 lg:gap-x-4 p-2 md:p-3 lg:p-4';

const { query, update } = usePaginationQuery<BooruParams>();
const { data, error } = useFetch<BooruData[]>('/api/list', { query });

const lightbox = ref<PhotoSwipeLightbox>();
const container = useTemplateRef('container');

onMounted(createLightbox);
onUnmounted(destroyLightbox);

function createLightbox() {
  if (!container.value) return;
  const lb = (lightbox.value = new PhotoSwipeLightbox({
    initialZoomLevel: 'fit',
    gallery: container.value,
    children: '.ps__item',
    pswpModule: () => import('photoswipe'),
  }));

  lb.init();
}
function destroyLightbox() {
  if (!lightbox.value) return;
  lightbox.value.destroy();
  lightbox.value = undefined;
}
</script>

<template>
  <div ref="container" :class="COLUMNS">
    <template v-if="!data">
      <Skeleton
        v-for="_ in 20"
        class="w-full mb-2 md:mb-3 lg:mb-4 rounded-xl"
        :style="`height: ${randomInt(300, 600)}px`" />
    </template>
    <template v-else>
      <div v-for="item in data" class="mb-2 md:mb-3 lg:mb-4 overflow-hidden rounded-xl">
        <NuxtLink
          external
          target="_blank"
          class="ps__item"
          data-cropped="true"
          :data-pswp-src="item.file_url"
          :data-pswp-width="item.width"
          :data-pswp-height="item.height"
          :to="`https://safebooru.org/index.php?page=post&s=view&id=${item.id}`">
          <img
            @error="handleImageError($event, item)"
            :key="item.hash"
            :alt="item.tags"
            :src="item.sample_url"
            :data-hires="item.file_url"
            class="w-full"
            loading="lazy" />
        </NuxtLink>
      </div>
    </template>
    <Teleport to=".prev-btn">
      <Button
        variant="ghost"
        class="rounded-full px-2.5"
        :disabled="query.page < 2"
        @click="update({ page: query.page - 1 })">
        <ChevronLeft class="w-6 h-6" />
      </Button>
    </Teleport>
    <Teleport to=".next-btn">
      <Button variant="ghost" class="rounded-full px-2.5" @click="update({ page: query.page + 1 })">
        <ChevronRight class="w-6 h-6" />
      </Button>
    </Teleport>
  </div>
</template>
