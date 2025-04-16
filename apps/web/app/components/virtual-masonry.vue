<script setup lang="ts">
import type { VNodeRef } from 'vue';

import { useVirtualizer } from '@tanstack/vue-virtual';

interface Props {
  gap?: number;
  count: number;
  width?: number;
  containerRef?: VNodeRef;
  estimateSize: (i: number, lane: number) => number;
}

const props = withDefaults(defineProps<Props>(), { gap: 8 });

const root = useTemplateRef('root');
const userConfig = useUserConfig();
const { width: windowWidth } = useWindowSize();

const rootOffset = ref(0);
const windowW = throttledRef(windowWidth, 150);

const lanes = computed(() => {
  if (userConfig.column) return userConfig.column;
  else if (windowW.value >= 1536) return 4;
  else if (windowW.value >= 1024) return 3;
  else return 2;
});
const options = computed(() => ({
  gap: props.gap,
  count: props.count,
  lanes: lanes.value,
  overscan: lanes.value,
  estimateSize: (i: number) => props.estimateSize(i, lanes.value),
  getScrollElement: () => root.value || document.documentElement,
}));
const virtualizer = useVirtualizer(options);

const width = computed(() => {
  if (typeof props.width == 'number') return props.width;
  switch (userConfig.column) {
    case 4:
      return 25;
    case 3:
      return 33.333;
    case 2:
      return 50;
    case 1:
      return 100;
    default:
      if (windowW.value >= 1536) return 25;
      else if (windowW.value >= 1024) return 33.333;
      else return 50;
  }
});
const totalSize = computed(() => virtualizer.value.getTotalSize());
const virtualRows = computed(() => virtualizer.value.getVirtualItems());

defineExpose({ virtualizer, el: root });

onMounted(() => (rootOffset.value = root.value?.offsetTop ?? 0));
watchDebounced([width, windowW], () => virtualizer.value.measure(), { debounce: 100 });
</script>

<template>
  <div ref="root">
    <div :ref="containerRef" class="w-full relative overflow-hidden" :style="{ height: `${totalSize}px` }">
      <div
        :key="row.index"
        :data-index="i"
        :data-content-index="row.index"
        class="absolute top-0 transition-all duration-300"
        :style="{
          left: `calc(${row.lane * width}% + ${row.lane * (gap / 2)}px)`,
          width: `calc(${width}% - ${gap}px)`,
          transform: `translate3d(0,${row.start}px,0)`,
        }"
        v-for="(row, i) in virtualRows">
        <slot :row :virtualizer="virtualizer" />
      </div>
    </div>
    <slot name="end" />
  </div>
</template>
