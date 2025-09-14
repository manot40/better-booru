<script setup lang="ts">
import type { Post } from '@boorugator/shared/types';

const props = defineProps<{ item: Post }>();

const config = useUserConfig();

const hideNSFW = computed(() => config.hideNSFW && ['e', 'q'].includes(props.item.rating));
</script>

<template>
  <NuxtLink :id="item.id" :to="{ query: $route.query, hash: `#${item.id}` }" class="block relative z-0">
    <img
      :src="item.preview_url"
      :width="item.preview_width"
      :height="item.preview_height"
      :key="item.hash"
      :alt="item.tags || item.artist || item.hash"
      class="w-full h-full object-cover max-h-[900px]" />
    <Transition name="blur-fade">
      <div class="w-full h-full absolute left-0 top-0 z-10 bg-black/25 backdrop-blur-xl" v-if="hideNSFW" />
    </Transition>
  </NuxtLink>
</template>
