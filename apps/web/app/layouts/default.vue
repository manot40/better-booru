<script setup lang="ts">
const colorMode = useColorMode();

const htmlAttrs = <any>computed(() => ({ class: colorMode.value }));

useHead({ htmlAttrs });
</script>

<template>
  <Card
    class="nav-root fixed w-full z-30 top-0 rounded-none border-x-0 bg-card/80 backdrop-blur-lg p-0"
    :data-show="true">
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
        <PostSearch class="flex-1" />
        <Menu />
      </div>
    </div>
  </Card>
  <div><slot /></div>
</template>

<style scoped>
.nav-root {
  transition: all 0.5s cubic-bezier(0.1, 0.9, 0.2, 1);
}
.nav-root[data-show='false'] {
  transform: translate3d(0, -100%, 0);
}
</style>
