<script setup lang="ts">
import { HistoryIcon, Settings, Settings2 } from 'lucide-vue-next';

const configOpen = ref(false);
const historyOpen = ref(false);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" class="w-10 h-10 p-0">
        <Settings class="w-8 h-8" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent avoidCollisions align="end" class="w-52">
      <DropdownMenuGroup>
        <DropdownMenuItem class="cursor-pointer" @click="configOpen = true">
          <Settings2 class="w-4 h-4" />
          <span>Site Config</span>
        </DropdownMenuItem>
        <DropdownMenuItem class="cursor-pointer" @click="historyOpen = true">
          <HistoryIcon class="w-4 h-4" />
          <span>Browse History</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup class="p-1"><SettingThemeSwitcher /></DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>

  <LazySettingSiteWide hydrateOnIdle v-model:open="configOpen" />
  <LazySettingBrowseHistory hydrateOnIdle v-model:open="historyOpen" />
</template>
