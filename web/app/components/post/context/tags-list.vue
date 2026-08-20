<script setup lang="ts">
import { EnumTagCategory } from '~/utils/icon-from-cat';

defineEmits<{ tag: [tag: string] }>();
withDefaults(defineProps<{ tags?: InternalApiTagItem[]; title?: string | null; foldable?: boolean }>(), {
  title: 'tags',
});
</script>

<template>
  <div class="tags">
    <div class="text-xs md:text-sm font-bold md:font-medium mb-2" v-if="title">
      {{ startCase(title) }}
    </div>
    <Foldable :disable="!foldable" class="max-h-44">
      <div class="flex flex-wrap gap-1.5">
        <Skeleton class="h-6" :style="{ width: `${randomInt(50, 100)}px` }" v-if="!tags" v-for="_ in 20" />
        <a
          v-else
          v-for="{ id: key, name, category: cat } in tags"
          :key
          :href="`/?tags=${name}`"
          @click.prevent="$emit('tag', name!)">
          <Badge
            :key
            class="whitespace-nowrap"
            :variant="!cat || cat === EnumTagCategory.General ? 'secondary' : 'default'">
            <component :is="getIconFromCategory(cat)" class="size-3.5 mr-1" v-if="cat" />
            {{ name || key }}
          </Badge>
        </a>
      </div>
    </Foldable>
  </div>
</template>

<style scoped>
.overflow-auto::-webkit-scrollbar {
  display: none;
}
</style>
