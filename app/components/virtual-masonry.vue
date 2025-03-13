<script setup lang="ts">
import type { VNodeRef } from 'vue';

import { useWindowVirtualizer, type VirtualItem } from '@tanstack/vue-virtual';

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
}));
const virtualizer = useWindowVirtualizer(options);

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

function calcTopPx(row: VirtualItem, index: number, entry?: IntersectionObserverEntry): [number, number] {
  const DEFAULT = [row.start, 1] as [number, number];
  if (!entry) return DEFAULT;

  if (!entry.isIntersecting) {
    const offset = lanes.value > 2 ? 0.1 : 0.3;
    const rowSize = Math.floor(virtualRows.value.length / lanes.value);
    if (index < rowSize) return [row.start - row.size * offset, 0];
    else return [row.start + row.size * offset, 0];
  }

  return DEFAULT;
}

defineExpose({ virtualizer });
watch([width, windowW], () => virtualizer.value.measure());
onMounted(() => (rootOffset.value = root.value?.offsetTop ?? 0));
</script>

<template>
  <div ref="root">
    <div :ref="containerRef" class="w-full relative overflow-hidden" :style="{ height: `${totalSize}px` }">
      <UtilIntersectionObserver
        :key="row.index"
        :options="{ rootMargin: '-16% 0px 0px 0px' }"
        v-for="(row, rowI) in virtualRows">
        <template #default="{ entry }">
          <div
            :data-row="rowI"
            :data-index="row.index"
            class="absolute top-0"
            :style="{
              left: `calc(${row.lane * width}% + ${row.lane * (gap / 2)}px)`,
              width: `calc(${width}% - ${gap}px)`,
              opacity: calcTopPx(row, rowI, entry)[1],
              transform: `translate3d(0,${calcTopPx(row, rowI, entry)[0]}px,0)`,
            }">
            <slot :row :virtualizer="virtualizer" />
          </div>
        </template>
      </UtilIntersectionObserver>
    </div>
  </div>
</template>

<style scoped>
.absolute {
  --timing: 0.3s;
  --easing: cubic-bezier(0.4, 0, 0.2, 1);
  transition:
    transform var(--timing) var(--easing),
    left var(--timing) var(--easing),
    opacity 0.2s linear;
}
</style>
