<script setup lang="ts">
import type { ListParams, Post } from '~~/types/common';

import 'photoswipe/style.css';

import { SquareArrowOutUpRight } from 'lucide-vue-next';

const COLUMNS = 'columns-2 md:columns-3 xl:columns-4 gap-x-2 md:gap-x-3 lg:gap-x-4 p-2 md:p-3 lg:p-4';

const userConfig = useUserConfig();

const headers = computed(() => ({
  'x-rating': userConfig.rating?.join(' ') || '',
  'x-provider': userConfig.provider,
}));
const paginator = usePaginationQuery<ListParams>();
const { data } = useFetch('/api/post', { query: paginator.query, headers });

const container = useTemplateRef('container');
const { rendered } = useLightbox(container);

function handleImageError(e: Event, item: Post) {
  const el = <HTMLImageElement>e.currentTarget;
  const retry = isNaN(+el.dataset.retry!) ? 0 : +el.dataset.retry!;
  const userConfig = useUserConfig();

  if (userConfig.provider !== 'safebooru') return;

  if (el.src === item.preview_url) return;
  else if (retry > 4) {
    el.src = item.preview_url;
    return;
  }

  el.dataset.retry = `${retry + 1}`;
  if (el.src === item.file_url) {
    el.src = item.file_url.replace('org/image', 'org//image');
  } else if (el.src.includes('org/sample')) {
    el.src = item.sample_url.replace('org/sample', 'org//sample');
  } else if (el.src.includes('org//')) {
    el.src = el.src + `?${item.id}`;
  } else if (el.src.includes('?')) {
    el.src = el.src.replace('org//', 'org/');
  }
}
</script>

<template>
  <div ref="container" :class="COLUMNS" class="mb-4">
    <template v-if="!data">
      <Skeleton
        v-for="_ in 20"
        class="w-full mb-2 md:mb-3 lg:mb-4 rounded-xl"
        :style="`height: ${randomInt(300, 600)}px`" />
    </template>
    <template v-else>
      <div v-for="item in data.post" :key="item.hash" class="mb-2 md:mb-3 lg:mb-4 overflow-hidden rounded-xl">
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
          <img
            class="w-full transition-all duration-200"
            :key="item.hash"
            :alt="item.tags"
            :src="item.sample_url || item.file_url"
            :width="item.sample_width || item.width"
            :height="item.sample_height || item.height"
            :data-hires="item.file_url"
            @error="handleImageError($event, item)" />
        </NuxtLink>
      </div>
    </template>

    <Teleport to=".pswp__open" v-if="rendered"><SquareArrowOutUpRight class="w-5 h-5 mx-auto" /></Teleport>

    <Teleport to=".bottom-bar"><PostFilter :count="data?.meta?.count" :paginator /></Teleport>
    <!-- <Teleport to=".prev-btn">
      <Button
        variant="ghost"
        class="rounded-full px-2.5"
        @click="updatePage('prev')"
        :disabled="isNaN(+query.page) || query.page < 2">
        <ChevronLeft class="w-6 h-6" />
      </Button>
    </Teleport>
    <Teleport to=".next-btn">
      <Button variant="ghost" class="rounded-full px-2.5" @click="updatePage('next')">
        <ChevronRight class="w-6 h-6" />
      </Button>
    </Teleport> -->
  </div>
</template>
