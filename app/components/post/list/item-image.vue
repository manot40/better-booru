<script setup lang="ts">
import type { Post } from '~~/types/common';

defineProps<{ item: Post; index: number }>();

function reduceSize(item: Post): [string, number, number] {
  const src = item.sample_url || item.file_url;
  const width = item.sample_width || item.width;
  const height = item.sample_height || item.height;

  const square = width * height;
  const division = square > 2_000_000 ? 3 : square > 1_000_000 ? 2 : 1;
  return [src, Math.round(width / division), Math.round(height / division)];
}
</script>

<template>
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
        :loading="index > 20 ? 'lazy' : 'eager'"
        :data-hires="item.file_url"
        class="w-full transition-all duration-200" />
    </UtilMapObj>
  </NuxtLink>
</template>
