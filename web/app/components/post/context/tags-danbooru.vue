<script setup lang="ts">
import { EnumTagCategory } from '~/utils/icon-from-cat';

type GroupedTag = Record<'general' | 'meta', InternalApiTagItem[]>;

defineEmits<{ changeTag: [tags: string] }>();
defineOptions({ inheritAttrs: false });

const props = defineProps<{ postId: number }>();

const { data: tags, status } = useLazyAsyncData(`post-tags-${props.postId}`, fetchTags, {
  watch: [() => props.postId],
  transform: (d) =>
    d.reduce(
      (acc, next) => {
        if (next.category === EnumTagCategory.General) acc.general.push(next);
        else acc.meta.push(next);
        return acc;
      },
      <GroupedTag>{ general: [], meta: [] }
    ),
});
async function fetchTags() {
  const { data, error } = await getApiPostsByIdTags({ path: { id: props.postId } });
  if (data) return data;
  throw error;
}
</script>

<template>
  <PostContextTagsList v-if="isPend(status) || !tags" />
  <template v-else>
    <PostContextTagsList :tags="tags.meta" class="mb-2.5" :title="null" @tag="$emit('changeTag', $event)" />
    <PostContextTagsList foldable :tags="tags.general" @tag="$emit('changeTag', $event)" />
  </template>
</template>
