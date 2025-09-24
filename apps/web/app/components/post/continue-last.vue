<script setup lang="ts">
import type { ListParams, UserData } from '@boorugator/shared/types';

interface Props {
  paginator: UsePagination<ListParams>;
  lastSession: UserData['lastBrowse'][string];
}

const props = defineProps<Props>();

function continueBrowse() {
  const [page, tags] = props.lastSession;
  /** @todo handle this using paginator when we figure out the navigation bugfix */
  navigateTo({ query: { page, tags: tags || undefined } }, { external: true });
}
</script>

<template>
  <Button size="sm" variant="link" class="h-6" @click="continueBrowse">Continue from where you left?</Button>
</template>
