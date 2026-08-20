<script setup lang="ts">
const id = randomInt(0, 9999).toString(12);
const [UseTrigger, Trigger] = createReusableTemplate();

const props = defineProps<{ btnClass?: string; multiple?: boolean }>();
defineOptions({ inheritAttrs: false });

const content = useTemplateRef('content');
const isDesktop = useMediaQuery('(min-width: 768px)');

const open = ref(false);
const overflowing = ref(false);

onClickOutside(content, (e) => {
  if (!isDesktop.value) return;

  const ELs = ['svg', 'path', 'circle'];
  const target = e.target as HTMLElement,
    parent = target.parentElement,
    cl = target.classList;

  const checkIfMatch = (target: HTMLElement | null, check: any, parent?: boolean) =>
    target && target instanceof check && (parent ? target.parentElement : target)?.dataset.id !== id;

  if (
    !props.multiple &&
    (checkIfMatch(target, HTMLButtonElement) || checkIfMatch(parent, HTMLButtonElement))
  ) {
    open.value = false;
  } else if (cl.contains('trigger') || ELs.includes(target.tagName.toLowerCase())) {
    if (!props.multiple && checkIfMatch(parent, SVGAElement, true)) open.value = false;
    return;
  }

  open.value = false;
});

const { height } = useElementSize(content);
watch(height, (h) => (overflowing.value = h >= window.innerHeight - 80));
</script>

<template>
  <UseTrigger v-slot="{ $slots }">
    <Button
      size="lg"
      :data-id="id"
      variant="ghost"
      @click="open = !open"
      :class="['trigger flex gap-2 items-center', btnClass]">
      <component :is="$slots.default" />
    </Button>
  </UseTrigger>

  <Popover v-if="isDesktop" :open>
    <PopoverTrigger asChild>
      <Trigger><slot name="trigger" /></Trigger>
    </PopoverTrigger>
    <PopoverContent
      asChild
      avoidCollisions
      align="center"
      class="w-full max-w-sm lg:max-w-md bg-background/80 backdrop-blur-lg">
      <div ref="content" v-bind="$attrs"><slot /></div>
    </PopoverContent>
  </Popover>
  <Drawer v-else v-model:open="open">
    <DrawerTrigger asChild>
      <Trigger><slot name="trigger" /></Trigger>
    </DrawerTrigger>
    <DrawerContent class="!max-h-dvh bg-background/60 backdrop-blur-lg">
      <div
        ref="content"
        :class="['relative mt-4 pt-0 p-4', overflowing && 'overflow-auto overflow-x-hidden']"
        v-bind="$attrs">
        <slot />
      </div>
    </DrawerContent>
  </Drawer>
</template>
