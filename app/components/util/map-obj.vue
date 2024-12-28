<script setup lang="ts" generic="T extends object, R = unknown">
defineProps<{ data?: T; fn: (data: T) => R }>();
</script>

<template>
  <slot :result="fn(data as T)" />
</template>
