<script setup lang="ts">
import type { UserConfig } from '~~/types/common';

import { Sun, Moon, SwatchBook, Settings } from 'lucide-vue-next';

const colorMode = useColorMode();
const isDesktop = useMediaQuery('(min-width: 768px)');
const userConfig = useUserConfig();

const drawerOpen = ref(false);

const [TriggerTemplate, TriggerComponent] = createReusableTemplate();
const [ContentTemplate, ContentComponent] = createReusableTemplate();
const [RatingTemplate, RatingComponent] = createReusableTemplate();

const column = computed({
  get: () => (userConfig.column ? +userConfig.column : 0),
  set: (e) => userConfig.mutate({ column: typeof e != 'number' ? undefined : <UserConfig['column']>e }),
});
const provider = computed({
  get: () => userConfig.provider,
  set: (e) => userConfig.changeProvider(e),
});
const infiScroll = computed({
  get: () => userConfig.fetchMode === 'infinite',
  set: (e) => userConfig.mutate({ fetchMode: e ? 'infinite' : 'paginated' }),
});
</script>

<template>
  <RatingTemplate>
    <div class="form-control">
      <Label class="block mb-2 text-xs" for="rating-picker">Rating</Label>
      <RatingPicker />
    </div>
  </RatingTemplate>

  <TriggerTemplate>
    <Button variant="ghost" class="w-10 h-10 p-0">
      <Settings class="w-8 h-8" />
    </Button>
  </TriggerTemplate>

  <ContentTemplate>
    <div class="form-control">
      <Label class="block mb-2 text-xs">Booru Source</Label>
      <Tabs v-model="provider">
        <TabsList class="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="danbooru">Dan</TabsTrigger>
          <TabsTrigger value="gelbooru">Gel</TabsTrigger>
          <TabsTrigger value="safebooru">Safe</TabsTrigger>
        </TabsList>
        <TabsContent value="danbooru"><RatingComponent /></TabsContent>
        <TabsContent value="gelbooru"><RatingComponent /></TabsContent>
      </Tabs>
    </div>
    <Separator class="mt-1.5 mb-0.5" />

    <div class="flex items-end gap-6 lg:gap-4 mb-1.5">
      <NumberField :min="0" :max="4" v-model="column" id="columns" class="w-full">
        <Label class="text-xs mb-1" for="columns">Column per Row</Label>
        <NumberFieldContent>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldContent>
      </NumberField>
      <div v-if="userConfig.provider === 'danbooru'" class="flex items-center space-x-2 shrink-0 mb-2">
        <Switch v-model="infiScroll" id="infi-scroll" />
        <Label for="infi-scroll">Infinite Scroll</Label>
      </div>
    </div>

    <div class="form-control">
      <Label class="block mb-2 text-xs" for="theme-picker">Theme</Label>
      <Select id="theme-picker" v-model:modelValue="colorMode.preference">
        <SelectTrigger class="w-full">
          <SelectValue placeholder="Choose Theme" />
          <SelectContent>
            <SelectItem :key="value" :value v-for="value in ['system', 'light', 'dark']">
              <div class="flex items-center">
                <SwatchBook class="w-5 h-5 mr-3" v-if="value === 'system'" />
                <Sun class="w-5 h-5 mr-3" v-else-if="value === 'light'" />
                <Moon class="w-5 h-5 mr-3" v-else />
                {{ startCase(value) }}
              </div>
            </SelectItem>
          </SelectContent>
        </SelectTrigger>
      </Select>
    </div>
  </ContentTemplate>

  <Popover v-if="isDesktop">
    <PopoverTrigger as-child><TriggerComponent /></PopoverTrigger>
    <PopoverContent class="w-80">
      <div class="grid gap-2.5">
        <ContentComponent />
      </div>
    </PopoverContent>
  </Popover>

  <Drawer v-else v-model:open="drawerOpen">
    <DrawerTrigger as-child><TriggerComponent /></DrawerTrigger>
    <DrawerContent>
      <DrawerHeader class="text-left">
        <DrawerTitle>User Configuration</DrawerTitle>
        <DrawerDescription>Data source and site-wide experience configuration</DrawerDescription>
      </DrawerHeader>
      <div class="grid gap-3 px-4 my-4">
        <ContentComponent />
      </div>
      <DrawerFooter class="pt-2">
        <DrawerClose as-child>
          <Button variant="outline">Dismiss</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
