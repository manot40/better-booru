<script setup lang="ts">
import { Sun, Moon, SwatchBook } from 'lucide-vue-next';

const colorMode = useColorMode();
const { top, scrollUp, isBottom } = useScrollDirection(200);

const ThemeIcon = computed(() =>
  colorMode.preference === 'system' ? SwatchBook : colorMode.preference === 'light' ? Sun : Moon
);

const openSearch = ref(false);
watch(scrollUp, (v) => !v && (openSearch.value = false));

function toggleTheme() {
  switch (colorMode.preference) {
    case 'system':
      return (colorMode.preference = 'light');
    case 'light':
      return (colorMode.preference = 'dark');
    default:
      colorMode.preference = 'system';
  }
}
</script>

<template>
  <Card
    class="sticky z-30 top-0 rounded-none border-x-0 bg-card/80 backdrop-blur-lg"
    :data-show="top < 300 || scrollUp">
    <div class="flex items-center justify-between gap-4 px-3 py-2">
      <div class="w-6"></div>
      <NuxtLink :to="{ name: 'index' }">
        <h1 class="uppercase select-none tracking-wider text-lg md:text-xl">
          <strong>Better</strong>
          Safebooru
        </h1>
      </NuxtLink>
      <Button variant="ghost" class="w-10 h-10 p-0" @click="toggleTheme">
        <ThemeIcon class="w-8 h-8" />
      </Button>
    </div>
  </Card>
  <slot />
  <div
    class="sticky z-30 bottom-2 lg:bottom-4 w-full max-md:px-4"
    :data-show="top < 300 || isBottom || scrollUp">
    <Card
      class="flex justify-between items-center p-2 gap-2 max-w-sm md:max-w-md mx-auto bg-card/80 backdrop-blur-lg"
      @click="colorMode.preference = 'dark'">
      <div class="prev-btn" />
      <Searchbar class="flex-1" v-model:open="openSearch" />
      <div class="next-btn" />
    </Card>
  </div>
</template>

<style scoped>
.sticky {
  transition: all 0.5s cubic-bezier(0.1, 0.9, 0.2, 1);
}
.sticky.top-0[data-show='false'] {
  transform: translate3d(0, -100%, 0);
}
.sticky.bottom-2[data-show='false'] {
  transform: translate3d(0, 130%, 0);
}
</style>
