<script setup lang="ts">
const { top, scrollUp } = useScrollActive(300);
</script>

<template>
  <slot />
  <div class="fixed w-full bottom-4 max-md:px-4" :data-show="top < 200 || scrollUp">
    <Card class="flex justify-between items-center p-2 gap-2 max-w-sm md:max-w-md mx-auto">
      <div class="prev-btn" />
      <Searchbar class="flex-1" />
      <div class="next-btn" />
    </Card>
  </div>
</template>

<style scoped>
.fixed {
  transition: all 0.35s cubic-bezier(0.1, 0.9, 0.2, 1);
}
.fixed[data-show='x'] {
  transform: translate3d(0, 130%, 0);
}
</style>
