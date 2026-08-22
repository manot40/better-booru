<script setup lang="ts">
import type { Directive } from "vue";

const props = defineProps<{ item: InternalApiPostItem }>();

const config = useUserConfig();

const loaded = ref(false);
const loading = computed(() => !!props.item.lqip && !loaded.value);
const hideNSFW = computed(() => config.hideNSFW && ["e", "q"].includes(props.item.rating!));

const toggleLoaded = () => (loaded.value = true);

const vImage: Directive<HTMLImageElement> = {
  created(el) {
    el.addEventListener("load", toggleLoaded, { once: true });
    // prettier-ignore
    el.addEventListener("error", () => {
      el.src = new URL(`/images/preview/${props.item.hash}`, location.origin).toString();
    }, { once:true });
  },
};
</script>

<template>
  <NuxtLink :id="`${item.id}`" :to="{ query: $route.query, hash: `#${item.id}` }" class="block relative z-0 h-full">
    <img
      v-image
      :src="item.preview_url"
      :width="item.preview_width"
      :height="item.preview_height"
      :key="item.hash"
      :alt="item.source || item.hash!"
      class="size-full object-cover bg-cover bg-no-repeat max-h-225 relative z-1"
    />

    <img v-if="!loaded && item.lqip" :src="item.lqip" class="absolute z-0 top-0 left-0 size-full" />

    <Transition name="blur-fade">
      <div
        v-show="hideNSFW || loading"
        :class="['size-full absolute left-0 top-0 z-10', hideNSFW ? 'backdrop-blur-xl bg-black/25' : 'backdrop-blur-sm bg-black/20']"
      />
    </Transition>
  </NuxtLink>
</template>
