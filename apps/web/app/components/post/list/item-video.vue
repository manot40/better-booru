<script setup lang="ts">
import type { Post } from '@boorugator/shared/types';

defineProps<{ item: Post }>();
</script>

<template>
  <video
    loop
    muted
    controls
    playsinline
    :width="item.width"
    :height="item.height"
    :poster="unshortenUrl(item.preview_url || item.sample_url || '')">
    <source :src="item.file_url" />
  </video>
</template>
