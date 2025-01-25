<script setup lang="ts">
import '@fontsource-variable/rubik';

const colorMode = useColorMode();

const htmlAttrs = computed(() => ({ class: colorMode.value }));

useHead({ title: 'Better Safebooru', htmlAttrs });
</script>

<template>
  <div vaul-drawer-wrapper>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
