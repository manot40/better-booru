<script setup lang="ts">
import { Pin, Settings, Settings2 } from 'lucide-vue-next';

const configOpen = ref(false);
const checkpointOpen = ref(false);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" class="w-10 h-10 p-0">
        <Settings class="w-8 h-8" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent avoidCollisions align="end" class="w-48">
      <DropdownMenuGroup>
        <DropdownMenuItem class="cursor-pointer" @click="configOpen = true">
          <Settings2 class="w-4 h-4" />
          <span>Site Config</span>
        </DropdownMenuItem>
        <DropdownMenuItem class="cursor-pointer" @click="checkpointOpen = false">
          <Pin class="w-4 h-4 -rotate-45" />
          <span>Saved Checkpoint</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup class="p-1"><SettingThemeSwitcher /></DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>

  <LazySettingSiteWide hydrateOnIdle v-model:open="configOpen" />
  <LazySettingCheckpoint hydrateOnIdle v-model:open="checkpointOpen" />
</template>
