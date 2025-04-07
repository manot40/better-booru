<script setup lang="ts">
import type { TagCategory } from '@boorugator/shared/types';

type GroupedTag = Record<'general' | 'meta', { key: string; category?: TagCategory }[]>;

defineEmits<{ changeTag: [tags: string] }>();
defineOptions({ inheritAttrs: false });

const props = defineProps<{ postId: number }>();

const { data: tags, status } = useLazyAsyncData(`post-tags-${props.postId}`, fetchTags, {
  watch: [() => props.postId],
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
async function fetchTags() {
  const { data, error } = await eden.api.posts({ id: props.postId }).tags.get();
  if (data) return data;
  throw error;
}
</script>

<template>
  <PostContextTagsList v-if="isPend(status) || !tags" />
  <template v-else>
    <PostContextTagsList :tags="tags.meta" class="mb-2.5" title="Meta" @tag="$emit('changeTag', $event)" />
    <PostContextTagsList foldable :tags="tags.general" @tag="$emit('changeTag', $event)" />
  </template>
</template>
