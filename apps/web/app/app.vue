<script setup lang="ts">
import '@fontsource-variable/rubik';

const colorMode = useColorMode();

const htmlAttrs = <any>computed(() => ({ class: colorMode.value }));

useHead({ title: 'Booru Aggregator', htmlAttrs });
</script>

<template>
  <div vaul-drawer-wrapper>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
