<script setup lang="ts">
import { UserRoundCog, Settings, Pin } from 'lucide-vue-next';

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
      <DropdownMenuItem class="cursor-pointer" @click="configOpen = true">
        <UserRoundCog class="w-4 h-4" />
        <span>User Config</span>
      </DropdownMenuItem>
      <DropdownMenuItem class="cursor-pointer" @click="checkpointOpen = false">
        <Pin class="w-4 h-4 -rotate-45" />
        <span>Saved Checkpoint</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <LazySettingSiteWide hydrateOnIdle v-model:open="configOpen" />
  <LazySettingCheckpoint hydrateOnIdle v-model:open="checkpointOpen" />
</template>
