<script setup lang="ts">
defineProps<{ header?: [string, string?] }>();
const open = defineModel('open', { default: false });

const isDesktop = useMediaQuery('(min-width: 768px)');

watch(open, (open) => {
  if (open) return;
  const body = document.body;
  setTimeout(() => {
    body.style.overflow = '';
    body.style.pointerEvents = '';
  }, 600);
});
</script>

<template>
  <Dialog v-if="isDesktop" v-model:open="open">
    <DialogContent class="max-w-md">
      <DialogHeader class="mb-3" v-if="header">
        <DialogTitle>{{ header[0] }}</DialogTitle>
        <DialogDescription>{{ header[1] }}</DialogDescription>
      </DialogHeader>
      <slot :isDialog="Boolean(isDesktop)" />
      <DialogFooter v-if="$slots.footer || $slots['footer-dialog']">
        <slot name="footer-dialog" v-if="$slots['footer-dialog']" />
        <slot name="footer" :isDialog="Boolean(isDesktop)" v-else />
      </DialogFooter>
    </DialogContent>
  </Dialog>
  <Drawer v-else v-model:open="open">
    <DrawerContent>
      <DrawerHeader class="text-left" v-if="header">
        <DrawerTitle>{{ header[0] }}</DrawerTitle>
        <DrawerDescription v-if="header[1]">{{ header[1] }}</DrawerDescription>
      </DrawerHeader>
      <slot :isDialog="Boolean(isDesktop)" />
      <DrawerFooter v-if="$slots.footer || $slots['footer-drawer']">
        <slot name="footer-drawer" v-if="$slots['footer-drawer']" />
        <slot name="footer" :isDialog="Boolean(isDesktop)" v-else />
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
