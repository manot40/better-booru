<script setup lang="ts">
defineOptions({ inheritAttrs: false });
defineProps<{ noShadow?: boolean; disable?: boolean }>();

const folded = ref(true);
const cont = useTemplateRef('foldRef');

const { height } = useElementSize(
  computed(() => cont.value && Array.from(cont.value.childNodes).find((e) => e instanceof HTMLElement))
);

const isToggleable = ref(false);

onMounted(checkFoldable);
useEventListener('resize', checkFoldable);

throttledWatch(height, checkGrowing, { throttle: 100 });

function checkFoldable() {
  if (!cont.value || !folded.value) return;
  const state = cont.value.scrollHeight > cont.value.clientHeight;
  isToggleable.value = state;
}
function checkGrowing(next: number, prev: number) {
  if (!cont.value) return;
  const toggleable = (isToggleable.value = cont.value.scrollHeight > cont.value.clientHeight);
  if (!toggleable && next < prev) folded.value = true;
}
</script>

<template>
  <slot v-if="disable" />
  <div :class="['flex flex-col', { '!max-h-max': !folded }]" v-bind="$attrs" v-else>
    <div
      ref="foldRef"
      :class="{
        'overflow-hidden mb-1': folded,
        'line-clamp-3': isToggleable && folded,
        shadow: isToggleable && folded && !noShadow,
      }">
      <slot />
    </div>
    <Button
      size="sm"
      variant="ghost"
      @click="folded = !folded"
      :class="['shrink-0', !folded ? 'mt-2' : 'mt-1']"
      v-if="isToggleable">
      {{ folded ? 'Expand' : 'Fold' }}
    </Button>
  </div>
</template>

<style scoped>
.flex.flex-col {
  transition: max-height 0.3s var(--mo-dec-min);
}
.shadow {
  mask-image: linear-gradient(180deg, white calc(100% - 2.4rem), transparent);
}
</style>
