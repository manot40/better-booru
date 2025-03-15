<script setup lang="ts">
import type { ListParams, Post, TagCategory } from '~~/types/common';

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

const toTagList = (tags: string, category?: TagCategory) =>
  tags.split(' ').map((t) => ({ key: t, category }));

const metaTag = computed(() => {
  const group = post.value?.tags_grouping;
  if (!group) return [];
  return [
    ...toTagList(group.character, 'character'),
    ...toTagList(group.copyright, 'copyright'),
    ...toTagList(group.artist, 'artist'),
    ...toTagList(group.meta, 'meta'),
  ];
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
        <TagsIcon title="Post Tags" class="w-6 h-6" style="filter: drop-shadow(0px 0px 1px #000)" />
      </span>
    </PopoverTrigger>
    <PopoverContent avoidCollisions :align="isDesktop ? 'end' : 'center'" class="w-full max-w-sm">
      <div ref="content" class="w-full overflow-y-auto" style="max-height: calc(100dvh - 8rem)" v-if="post">
        <template v-if="post.tags_grouping">
          <PostContextTagsList :tags="metaTag" class="mb-2.5" title="Meta" @tag="changeTag" />
          <PostContextTagsList foldable :tags="toTagList(post.tags_grouping.tag)" @tag="changeTag" />
        </template>
        <PostContextTagsList @tag="changeTag" :tags="toTagList(post.tags)" v-else />
      </div>
    </PopoverContent>
  </Popover>
</template>
