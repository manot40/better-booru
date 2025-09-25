<script setup lang="ts">
import { CircleOff, SquareArrowOutUpRight, Trash2 } from 'lucide-vue-next';

const open = defineModel('open', { default: false });

const data = useUserData();
const userConfig = useUserConfig();

const header: [string, string] = ['Browse History', 'Your recent searches and post browsing history'];

const confirmDeleteKey = ref<string>();

const dateFmt = Intl.DateTimeFormat('en-US', {
  hour12: false,
  dateStyle: 'long',
  timeStyle: 'short',
}).format;
</script>

<template>
  <ResponsiveDialog :header v-model:open="open">
    <template #default>
      <div class="max-md:px-4 max-h-64 overflow-y-auto overflow-x-hidden">
        <div v-if="data.browseHistory.length > 0" class="flex flex-col gap-4">
          <Card v-for="(item, i) in data.browseHistory" :key="i" class="px-3 py-2 gap-2">
            <div class="flex justify-between items-center gap-4">
              <div class="flex flex-1 flex-col gap-2 text-xs overflow-hidden">
                <div class="text-muted-foreground">
                  <span class="max-md:hidden">#{{ `${item.page}`.replace(/^(a|b)/, '') }} -</span>
                  {{ dateFmt(item.lastMod) }}
                </div>
                <div v-if="item.tags" class="overflow-auto">
                  <div class="flex gap-1.5">
                    <NuxtLink
                      v-for="(tag, i) in item.tags"
                      :key="i"
                      :to="{ query: { page: 1, tags: tag.raw } }">
                      <PostTag :op="tag.op" :tag="tag.val" @click="open = false" />
                    </NuxtLink>
                  </div>
                </div>
                <em v-else>(untagged)</em>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <Popover v-slot="{ close }">
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="destructive"><Trash2 class="size-4" /></Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-44 p-3">
                    <div class="text-sm font-medium mb-3 text-center">Are you sure?</div>
                    <div class="flex gap-2 items-center">
                      <Button size="sm" variant="outline" class="flex-1" @click="close">Cancel</Button>
                      <Button
                        size="sm"
                        class="flex-1"
                        variant="destructive"
                        @click="
                          close();
                          data.deleteHistory(item.key);
                        ">
                        Delete
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button v-if="userConfig.isInfinite" size="sm" @click="open = false" asChild>
                  <NuxtLink :to="{ query: { page: item.page, tags: item.rawTags, reset: 'only-data' } }">
                    <SquareArrowOutUpRight class="size-4 md:hidden" />
                    <span class="max-md:hidden">Load</span>
                  </NuxtLink>
                </Button>
              </div>
            </div>
          </Card>
        </div>
        <EmptyState v-else class="my-4">
          <template #title>
            <div class="text-muted-foreground font-medium">No history records yet</div>
          </template>
          <template #icon>
            <CircleOff class="text-muted-foreground" />
          </template>
        </EmptyState>
      </div>
    </template>
    <template #footer-drawer>
      <Button variant="outline" @click="open = false">Dismiss</Button>
    </template>
  </ResponsiveDialog>
</template>
