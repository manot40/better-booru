<script setup lang="ts">
import type { VNode } from 'vue';

const emits = defineEmits(['intersect']);
const props = defineProps<{
  once?: boolean;
  options?: Parameters<typeof useIntersectionObserver>[2];
}>();

const el = shallowRef<HTMLElement>();

const run = ref(false);
const entry = shallowRef<IntersectionObserverEntry>();
const intersect = ref(false);

useIntersectionObserver(
  el,
  function ([entry_]) {
    if (!entry_) return;
    if (run.value && props.once) return;
    entry.value = entry_;
    const isIntersecting = (intersect.value = entry_.isIntersecting);
    if (!isIntersecting) return;
    run.value = true;
    emits('intersect');
  },
  props.options
);

onMounted(() => {
  const instance = getCurrentInstance();
  const [child] = <VNode[]>(instance?.subTree.children || []);
  if (child && child.el instanceof HTMLElement) el.value = child.el;
});
</script>

<template><slot :intersect :entry /></template>
