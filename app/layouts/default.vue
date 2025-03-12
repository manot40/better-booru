<script setup lang="ts">
const { top, scrollUp, isBottom } = useScrollDirection(150);

const openSearch = ref(false);
watch(scrollUp, (v) => !v && (openSearch.value = false));
</script>

<template>
  <Card
    class="nav-root fixed w-full z-30 top-0 rounded-none border-x-0 bg-card/80 backdrop-blur-lg"
    :data-show="top < 300 || scrollUp">
    <div class="flex items-center justify-between gap-4 px-4 py-2">
      <NuxtLink :to="{ name: 'index' }" class="shrink-0 uppercase select-none">
        <div class="max-md:hidden text-xl tracking-wider">
          <strong>Booru</strong>
          <span>Gator</span>
        </div>
        <div class="md:hidden text-lg">
          <strong>B</strong>
          <span>G</span>
        </div>
      </NuxtLink>
      <div class="flex items-center gap-4 shrink-0">
        <PostSearch class="flex-1" v-model:open="openSearch" />
        <Menu />
      </div>
    </div>
  </Card>
  <div style="padding-top: 3.75rem"><slot /></div>
  <div
    :data-show="top < 300 || isBottom || scrollUp"
    class="bottom-bar flex sticky z-30 bottom-2 lg:bottom-4 mt-4" />
</template>

<style scoped>
.nav-root,
.bottom-bar {
  transition: all 0.5s cubic-bezier(0.1, 0.9, 0.2, 1);
}
.nav-root[data-show='false'] {
  transform: translate3d(0, -100%, 0);
}
.bottom-bar[data-show='false'] {
  transform: translate3d(0, 130%, 0);
}
</style>
