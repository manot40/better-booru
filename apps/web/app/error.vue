<script setup lang="ts">
import { HeartCrack } from 'lucide-vue-next';

const error = useError();

const is404 = computed(() => error.value?.statusCode === 404);

useHead({ title: () => (is404.value ? 'Page Not Found | Booru Aggregator' : '💥💥💥') });
</script>

<template>
  <div vaul-drawer-wrapper>
    <NuxtLayout>
      <EmptyState class="w-dvw h-dvh" :title="is404 ? 'Page Not Found' : 'Something went wrong'">
        <template #icon><HeartCrack class="!size-18" /></template>
        <p>
          {{
            is404 ? "You won't find anything here" : 'Something definitely wrong. Try refreshing this page.'
          }}
        </p>
      </EmptyState>
    </NuxtLayout>
  </div>
</template>
