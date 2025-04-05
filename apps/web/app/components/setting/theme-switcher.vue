<script setup lang="ts">
import { Moon, Sun, SunMoon } from 'lucide-vue-next';

const THEMES = ['system', 'light', 'dark'] as const;

const colorMode = useColorMode();
</script>

<template>
  <Tabs v-model="colorMode.preference">
    <TabsList class="grid w-full grid-cols-3">
      <TabsTrigger :value :title="startCase(`${value} theme`)" v-for="value in THEMES">
        <SunMoon class="w-4 h-4" v-if="value === 'system'" />
        <Sun class="w-4 h-4" v-else-if="value === 'light'" />
        <Moon class="w-4 h-4" v-else />
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>
