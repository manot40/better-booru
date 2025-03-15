<script setup lang="ts">
defineEmits<{ tag: [tag: string] }>();
withDefaults(defineProps<{ tags: string; title?: string; noFold?: boolean }>(), {
  title: 'tags',
});

const folded = ref(true);
</script>

<template>
  <div class="tags">
    <div class="flex justify-between items-center text-xs mb-2">
      <div class="font-bold">{{ startCase(title) }}</div>
      <button class="hover:underline" @click="folded = !folded" v-if="!noFold">
        {{ folded ? 'Expand' : 'Fold' }}
      </button>
    </div>
    <div :class="['flex gap-1.5', !noFold && folded ? 'overflow-auto' : 'flex-wrap']">
      <button v-for="key in tags.split(' ')" @click="$emit('tag', key)">
        <Badge :key :variant="title === 'tags' ? 'secondary' : 'default'" class="whitespace-nowrap">
          {{ key }}
        </Badge>
      </button>
    </div>
  </div>
</template>

<style scoped>
.overflow-auto::-webkit-scrollbar {
  display: none;
}
</style>
