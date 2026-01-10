<script setup lang="ts">
import type { Post } from '@boorugator/shared/types';

import { VideoOffIcon } from 'lucide-vue-next';

const ALLOWED_FORMAT = ['webm', 'mp4'];

const props = defineProps<{ item: Post }>();

const video = computed<[string, string] | null>(() => {
  const post = props.item;
  if (ALLOWED_FORMAT.includes(post.file_ext)) return [post.file_url, post.file_ext];
  else if (post.preview_ext && ALLOWED_FORMAT.includes(post.preview_ext))
    return [post.preview_url, post.preview_ext];
  else return null;
});
</script>

<template>
  <video
    v-if="video"
    loop
    muted
    controls
    playsinline
    :id="item.id.toString()"
    :width="item.width"
    :height="item.height"
    :poster="item.preview_url || item.sample_url || undefined">
    <source :src="video[0]" :type="`video/${video[1]}`" />
  </video>
  <EmptyState v-else class="size-full" title="Unsupported Video Format">
    <VideoOffIcon class="size-4 mt-4" />
  </EmptyState>
</template>
