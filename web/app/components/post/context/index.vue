<script setup lang="ts">
import type { EnumTagCategory } from '~/utils/icon-from-cat';

import { InfoIcon, MessageCircleMoreIcon } from '@lucide/vue';

defineProps<{ post: InternalApiPostItem }>();
const emits = defineEmits<{ close: []; changeTag: [tag: string] }>();

const toTagList = (tags: string, category?: EnumTagCategory) =>
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
            <PostContextTagsList
              v-if="typeof post.tags == 'string'"
              @tag="changeTag"
              :tags="toTagList(post.tags)" />
            <PostContextTagsDanbooru v-else :postId="post.id!" @changeTag="changeTag" />
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
