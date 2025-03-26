<script setup lang="ts">
import type { TagCategory } from '~~/types/common';

type GroupedTag = Record<'general' | 'meta', { key: string; category?: TagCategory }[]>;

defineEmits<{ changeTag: [tags: string] }>();
defineOptions({ inheritAttrs: false });

const props = defineProps<{ postId: number }>();

const url = computed(() => `/api/post/${props.postId}/tags` as const);
const { data: tags, status } = useLazyFetch(url, {
  transform: (d) =>
    d.reduce(
      (acc, next) => {
        const c = next.category;
        const category = c === 1 ? 'artist' : c === 3 ? 'copyright' : c === 4 ? 'character' : 'meta';
        if (next.category === 0) acc.general.push({ key: next.name });
        else acc.meta.push({ key: next.name, category });
        return acc;
      },
      <GroupedTag>{ general: [], meta: [] }
    ),
});
</script>

<template>
  <PostContextTagsList v-if="isPend(status) || !tags" />
  <template v-else>
    <PostContextTagsList :tags="tags.meta" class="mb-2.5" title="Meta" @tag="$emit('changeTag', $event)" />
    <PostContextTagsList foldable :tags="tags.general" @tag="$emit('changeTag', $event)" />
  </template>
</template>
