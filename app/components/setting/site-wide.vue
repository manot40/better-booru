<script setup lang="ts">
import type { UserConfig } from '~~/types/common';

const header: [string, string] = ['Site Configuration', 'Data source and site-wide experience configuration'];
const HISTORY_MODE = ['url_query' as const, 'session' as const, 'cookie' as const];

const open = defineModel('open', { default: false });

const userConfig = useUserConfig();

const column = computed({
  get: () => (userConfig.column ? +userConfig.column : 0),
  set: (e) => userConfig.mutate({ column: typeof e != 'number' ? undefined : <UserConfig['column']>e }),
});
const provider = computed({
  get: () => userConfig.provider,
  set: (e) => userConfig.changeProvider(e),
});
const infiScroll = computed({
  get: () => userConfig.browseMode === 'infinite',
  set: (e) => userConfig.mutate({ browseMode: e ? 'infinite' : 'paginated' }),
});
const blurNSFW = computed({
  get: () => userConfig.hideNSFW,
  set: (e) => userConfig.mutate({ hideNSFW: e }),
});
const historyMode = computed({
  get: () => userConfig.historyMode,
  set: (e) => userConfig.mutate({ historyMode: e }),
});
</script>

<template>
  <ResponsiveDialog :header v-model:open="open">
    <template #default="{ isDialog }">
      <div :class="['grid', isDialog ? 'gap-3' : 'gap-4 px-4 my-4']">
        <div class="form-control">
          <Label class="block mb-2 text-xs">Booru Source</Label>
          <Tabs v-model="provider">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="danbooru">Danbooru</TabsTrigger>
              <TabsTrigger value="gelbooru">Gelbooru</TabsTrigger>
            </TabsList>
            <div class="flex items-end gap-4 mt-3">
              <div class="form-control flex-1">
                <Label class="block mb-2 text-xs" for="rating-picker">Rating</Label>
                <SettingRatingPicker />
              </div>
              <div class="flex items-center space-x-2 shrink-0 mb-2">
                <Switch v-model="blurNSFW" id="blur-nsfw" />
                <Label for="blur-nsfw">Blur NSFW</Label>
              </div>
            </div>
          </Tabs>
        </div>
        <Separator class="mt-2" />

        <div class="flex items-end gap-4">
          <NumberField :min="0" :max="4" v-model="column" id="columns" class="w-full">
            <Label class="text-xs mb-1" for="columns">Column per Row</Label>
            <NumberFieldContent>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldContent>
          </NumberField>
          <div class="flex items-center space-x-2 shrink-0 mb-2">
            <Switch v-model="infiScroll" id="infi-scroll" />
            <Label for="infi-scroll">Infinite Scroll</Label>
          </div>
        </div>

        <div class="form-control">
          <Label class="block mb-2 text-xs" for="history-mode">History Store</Label>
          <Select id="history-mode" v-model:modelValue="historyMode">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Choose History Store" />
              <SelectContent>
                <SelectItem :key="value" :value v-for="value in HISTORY_MODE">
                  {{ startCase(value.replace(/_|-/, ' ')) }}
                </SelectItem>
              </SelectContent>
            </SelectTrigger>
          </Select>
        </div>
      </div>
    </template>
    <template #footer-drawer>
      <Button variant="outline" @click="open = false">Dismiss</Button>
    </template>
  </ResponsiveDialog>
</template>
