<script setup lang="ts">
const { data, open } = useEdenWS(() => eden.sync.subscribe());
</script>

<template>
  <div>Open: {{ open }}</div>
  <div>Data: {{ data }}</div>
</template>
