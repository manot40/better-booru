<script setup lang="ts">
import { Badge } from '~/components/ui/badge';
import { TagsInputItem } from '~/components/ui/tags-input';

const props = defineProps<{ tag: string; op?: 'eq' | 'ne' | 'or'; asTagInput?: boolean }>();

const Component = props.asTagInput ? TagsInputItem : Badge;
</script>

<template>
  <component
    :is="Component"
    :key="tag"
    :value="tag"
    :class="[
      'rounded-sm py-3 text-white',
      !asTagInput && 'py-px px-1.5',
      op === 'ne' && 'bg-red-900',
      op === 'or' && 'bg-blue-700/80',
      (!op || op == 'eq') && 'bg-muted',
    ]">
    <div :class="[asTagInput && 'ml-2 mr-1 mb-1']">{{ tag.replace(/^(-|~)/, '') }}</div>
    <slot />
  </component>
</template>
