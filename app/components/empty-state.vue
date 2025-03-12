<script setup lang="ts">
type Props = { title?: string };

defineProps<Props>();
</script>

<template>
  <div class="grid text-center place-content-center px-6">
    <slot name="icon" />
    <slot name="title">
      <h2 class="text-2xl font-semibold mb-2" v-if="title">{{ title }}</h2>
    </slot>
    <slot />
  </div>
</template>

<style scoped>
.grid > :deep(svg) {
  @apply mx-auto mb-6 w-16 h-16;
}
</style>
