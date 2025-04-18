<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next';

type IconGroupProps = { icon: LucideIcon; value: string; iconClass?: string; textClass?: string };
defineProps<IconGroupProps>();
</script>

<template>
  <div class="flex gap-1.5 items-center">
    <component :is="icon" :class="['size-4', iconClass]" />
    <div :class="textClass || 'text-xs font-medium'">{{ value }}</div>
  </div>
</template>
