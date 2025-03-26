<script setup lang="ts">
import type { TagCategory } from '~~/types/common';

type Tag = { key: string; label?: string; category?: TagCategory };

defineEmits<{ tag: [tag: string] }>();
withDefaults(defineProps<{ tags?: Tag[]; title?: string; foldable?: boolean }>(), { title: 'tags' });
</script>

<template>
  <div class="tags">
    <div class="text-xs md:text-sm font-bold md:font-medium mb-2">{{ startCase(title) }}</div>
    <Foldable :disable="!foldable" class="max-h-44">
      <div class="flex flex-wrap gap-1.5">
        <Skeleton class="h-6" :style="{ width: `${randomInt(50, 100)}px` }" v-if="!tags" v-for="_ in 20" />
        <a
          :key
          :href="`/?tags=${key}`"
          @click.prevent="$emit('tag', key)"
          v-else
          v-for="{ key, label, category: cat } in tags">
          <Badge :key class="whitespace-nowrap" :variant="!cat || cat === 'tag' ? 'secondary' : 'default'">
            <component :is="getIconFromCategory(cat)" class="w-3.5 h-3.5 mr-1" v-if="cat" />
            {{ label || key }}
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
