<script setup lang="ts">
import type { LucideProps } from 'lucide-vue-next';
import type { FunctionalComponent as FC } from 'vue';

type Props = { title?: string; icon: FC<LucideProps>; iconClass?: string };

withDefaults(defineProps<Props>(), { iconClass: 'w-14 h-14' });
</script>

<template>
  <div class="grid text-center place-content-center">
    <icon :class="[iconClass, 'mx-auto mb-6']" />
    <slot name="title">
      <h2 class="text-2xl font-semibold mb-2.5" v-if="title">{{ title }}</h2>
    </slot>
    <slot />
  </div>
</template>
