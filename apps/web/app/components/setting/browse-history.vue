<script setup lang="ts">
import { SquareArrowOutUpRight, Trash2 } from 'lucide-vue-next';

const open = defineModel('open', { default: false });

const data = useUserData();
const userConfig = useUserConfig();

const header: [string, string] = ['Browse History', 'Your recent searches and post browsing history'];

const dateFmt = Intl.DateTimeFormat('en-US', {
  hour12: false,
  dateStyle: 'long',
  timeStyle: 'short',
}).format;
</script>

<template>
  <ResponsiveDialog :header v-model:open="open">
    <template #default>
      <div class="max-h-64 overflow-y-auto overflow-x-hidden">
        <div class="flex flex-col gap-4">
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
                      <PostTag :op="tag.op" :tag="tag.val" />
                    </NuxtLink>
                  </div>
                </div>
                <em v-else>(untagged)</em>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="destructive" @click="data.deleteHistory(item.key)">
                  <Trash2 class="size-4" />
                </Button>
                <Button v-if="userConfig.isInfinite" size="sm" asChild>
                  <NuxtLink
                    external
                    @click="open = false"
                    :to="{ query: { page: item.page, tags: item.rawTags } }">
                    <SquareArrowOutUpRight class="size-4 md:hidden" />
                    <span class="max-md:hidden">Load</span>
                  </NuxtLink>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </template>
    <template #footer-drawer>
      <Button variant="outline" @click="open = false">Dismiss</Button>
    </template>
  </ResponsiveDialog>
</template>
