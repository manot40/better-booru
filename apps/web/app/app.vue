<script setup lang="ts">
import '@fontsource-variable/rubik';

useHead({ title: 'Booru Aggregator' });
</script>

<template>
  <div vaul-drawer-wrapper>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
