<script setup lang="ts">
import type { Post } from '~~/types/common';

defineProps<{ item: Post }>();
</script>

<template>
  <video loop muted controls playsinline :poster="item.preview_url" :width="item.width" :height="item.height">
    <source :src="item.file_url" />
  </video>
</template>
