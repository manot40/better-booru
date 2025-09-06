<script setup lang="ts">
import type { Post } from '@boorugator/shared/types';

const props = defineProps<{ item: Post }>();

const config = useUserConfig();

const hideNSFW = computed(() => config.hideNSFW && ['e', 'q'].includes(props.item.rating));

function reduceSize(item: Post): [string, number, number] {
  const src = item.sample_url || item.file_url;
  const width = item.sample_width || item.width;
  const height = item.sample_height || item.height;

  const square = width * height;
  const division = square > 2_000_000 ? 3 : square > 1_000_000 ? 2 : 1;
  const w = Math.round(width / division);
  const h = Math.round(height / division);
  const url = `${BASE_URL}/image/f_webp&w_${w}&h_${h}/${src}`;

  return [url, w, h];
}
</script>

<template>
  <NuxtLink :id="item.id" :to="{ query: $route.query, hash: `#${item.id}` }" class="block relative z-0">
    <UtilMapObj :data="item" :fn="reduceSize" v-slot="[src, width, height]">
      <img
        :src
        :width
        :height
        :key="item.hash"
        :alt="item.tags || item.artist || item.hash"
        class="w-full h-full object-cover max-h-[900px]" />
      <Transition name="blur-fade">
        <div class="w-full h-full absolute left-0 top-0 z-10 bg-black/25 backdrop-blur-xl" v-if="hideNSFW" />
      </Transition>
    </UtilMapObj>
  </NuxtLink>
</template>
