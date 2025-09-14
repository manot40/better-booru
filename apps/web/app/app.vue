<script setup lang="ts">
import '@fontsource-variable/rubik';

const { public: config } = useRuntimeConfig();

useHead({
  title: 'Booru Aggregator',
  link: config.cdnUrl ? [{ rel: 'preconnect', href: config.cdnUrl }] : undefined,
});
</script>

<template>
  <div vaul-drawer-wrapper>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
