<script setup lang="ts">
const colorMode = useColorMode();

const htmlAttrs = computed(() => ({ class: colorMode.value }));

useHead({ title: 'Better Safebooru', htmlAttrs });
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
