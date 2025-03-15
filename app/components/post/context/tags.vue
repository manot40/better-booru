<script setup lang="ts">
import type { ListParams, Post } from '~~/types/common';

import { TagsIcon } from 'lucide-vue-next';

const emit = defineEmits(['close']);
const post = defineModel<Post>('post');
const props = defineProps<{ paginator: UsePagination<ListParams> }>();

const content = useTemplateRef('content');
const isDesktop = useMediaQuery('(min-width: 768px)');

const open = ref(false);
onClickOutside(content, (e) => {
  const target = e.target as HTMLElement;
  if (['svg', 'path', 'SPAN'].includes(target.tagName) || target.classList.contains('post-action')) return;
  open.value = false;
});

const metaTag = computed(() => {
  const group = post.value?.tags_grouping;
  if (!group) return '';
  return `${group.character} ${group.copyright} ${group.artist} ${group.meta}`.trim();
});

function changeTag(tags: string) {
  emit('close');
  props.paginator.set({ page: 1, tags });
}
</script>
<template>
  <Popover :open>
    <PopoverTrigger asChild aria-label="Post Tags" class="w-full h-full">
      <span class="grid place-content-center w-full h-full" @click="open = !open">
        <TagsIcon title="Post Tags" class="w-6 h-6" style="filter: drop-shadow(-1px -1px 0px #000)" />
      </span>
    </PopoverTrigger>
    <PopoverContent avoidCollisions :align="isDesktop ? 'end' : 'center'" class="w-full max-w-sm">
      <div ref="content" class="w-full" v-if="post">
        <template v-if="post.tags_grouping">
          <PostContextTagsList noFold :tags="metaTag" class="mb-2.5" title="Metadata" @tag="changeTag" />
          <PostContextTagsList noFold :tags="post.tags_grouping.tag" class="mb-2.5" @tag="changeTag" />
        </template>
        <PostContextTagsList noFold :tags="post.tags" @tag="changeTag" v-else />
      </div>
    </PopoverContent>
  </Popover>
</template>
