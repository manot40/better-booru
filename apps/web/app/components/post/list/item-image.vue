<script setup lang="ts">
import type { Post } from '@boorugator/shared/types';
import type { Directive } from 'vue';

const props = defineProps<{ item: Post }>();

const config = useUserConfig();

const loaded = ref(false);
const loading = computed(() => !!props.item.lqip && !loaded.value);
const hideNSFW = computed(() => config.hideNSFW && ['e', 'q'].includes(props.item.rating));

const toggleLoaded = () => (loaded.value = true);

const vLoaded: Directive<HTMLImageElement> = {
  created: (el) => el.addEventListener('load', toggleLoaded, { once: true }),
};
</script>

<template>
  <NuxtLink :id="`${item.id}`" :to="{ query: $route.query, hash: `#${item.id}` }" class="block relative z-0">
    <img
      v-loaded
      :src="item.preview_url"
      :width="item.preview_width"
      :height="item.preview_height"
      :key="item.hash"
      :alt="item.tags || item.artist || item.hash"
      :style="item.lqip ? { backgroundImage: `url(${item.lqip})` } : undefined"
      class="w-full h-full object-cover bg-cover bg-no-repeat max-h-[900px]" />
    <Transition name="blur-fade">
      <div
        v-show="hideNSFW || loading"
        :class="[
          'w-full h-full absolute left-0 top-0 z-10',
          hideNSFW ? 'backdrop-blur-xl bg-black/25' : 'backdrop-blur-sm bg-black/20',
        ]" />
    </Transition>
  </NuxtLink>
</template>
