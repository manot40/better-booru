<script setup lang="ts">
import type { Post, TagCategory } from '@boorugator/shared/types';

import { InfoIcon, MessageCircleMoreIcon, TagsIcon } from 'lucide-vue-next';

defineProps<{ post: Post }>();
const emits = defineEmits<{ close: []; changeTag: [tag: string] }>();

const toTagList = (tags: string, category?: TagCategory) =>
  tags.split(' ').map((t) => ({ key: t, category }));

function changeTag(tag: string) {
  emits('close');
  emits('changeTag', tag);
}
</script>

<template>
  <div class="flex bg-background/60 backdrop-blur-xl rounded-full">
    <PostContextPopover btnClass="rounded-l-full">
      <template #trigger>
        <InfoIcon title="Post Information" class="size-6" />
        <div class="trigger">Details</div>
      </template>
      <template #default>
        <PostContextInfo :post>
          <div>
            <PostContextTagsList @tag="changeTag" :tags="toTagList(post.tags)" v-if="post.tags" />
            <PostContextTagsDanbooru :postId="post.id" @changeTag="changeTag" v-else />
          </div>
        </PostContextInfo>
      </template>
    </PostContextPopover>

    <PostContextPopover btnClass="rounded-r-full">
      <template #trigger>
        <MessageCircleMoreIcon title="Post Comments" class="size-6" />
        <div class="trigger">Comments</div>
      </template>
      <template #default>TODO!</template>
    </PostContextPopover>
  </div>
</template>
