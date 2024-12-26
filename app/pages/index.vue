<script setup lang="ts">
import type { BooruParams } from '~~/types/booru';

import 'photoswipe/style.css';

import { ChevronLeft, ChevronRight, SquareArrowOutUpRight } from 'lucide-vue-next';

const COLUMNS = 'columns-2 md:columns-3 xl:columns-4 gap-x-2 md:gap-x-3 lg:gap-x-4 p-2 md:p-3 lg:p-4';

const { query, update } = usePaginationQuery<BooruParams>();
const { data } = useFetch('/api/list', { query });

const container = useTemplateRef('container');
const { rendered } = useLightbox(container);

function updatePage(pageState: 'prev' | 'next' | number) {
  if (pageState !== 'prev') setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  if (typeof pageState == 'number') return update({ page: pageState });

  const qValue = query.value.page;
  if (isNaN(+qValue)) update({ page: 1 });
  else update({ page: pageState == 'prev' ? qValue - 1 : qValue + 1 });
}
</script>

<template>
  <div ref="container" :class="COLUMNS" class="mb-6">
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
          :id="item.id"
          :data-pswp-src="item.file_url"
          :data-pswp-width="item.width"
          :data-pswp-height="item.height"
          :to="createBooruURL(item.id)">
          <img
            class="w-full transition-all duration-200"
            :key="item.hash"
            :alt="item.tags"
            :src="item.sample_url"
            :width="item.sample_width"
            :height="item.sample_height"
            :data-hires="item.file_url"
            :data-sample="item.sample_url"
            @error="handleImageError($event, item)" />
        </NuxtLink>
      </div>
    </template>

    <Teleport to=".pswp__open" v-if="rendered"><SquareArrowOutUpRight class="w-5 h-5 mx-auto" /></Teleport>

    <Teleport to=".prev-btn">
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
    </Teleport>
  </div>
</template>
