<script setup lang="ts">
import type { Provider } from '~~/types/common';

import { Sun, Moon, SwatchBook, Settings } from 'lucide-vue-next';

const colorMode = useColorMode();
const isDesktop = useMediaQuery('(min-width: 768px)');
const userConfig = useUserConfig();

const drawerOpen = ref(false);

const [TriggerTemplate, TriggerComponent] = createReusableTemplate();
const [ContentTemplate, ContentComponent] = createReusableTemplate();
const [RatingTemplate, RatingComponent] = createReusableTemplate();
</script>

<template>
  <RatingTemplate>
    <div class="form-control">
      <label class="block text-xs font-medium ml-1 mb-2" for="rating-picker">Rating</label>
      <RatingPicker />
    </div>
  </RatingTemplate>

  <TriggerTemplate>
    <Button variant="ghost" class="w-10 h-10 p-0">
      <Settings class="w-8 h-8" />
    </Button>
  </TriggerTemplate>

  <ContentTemplate>
    <div>
      <div class="block text-xs font-medium ml-1 mb-2">Booru Source</div>
      <Tabs
        :modelValue="userConfig.provider"
        @update:modelValue="userConfig.changeProvider(<Provider>$event)">
        <TabsList class="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="danbooru">Dan</TabsTrigger>
          <TabsTrigger value="gelbooru">Gel</TabsTrigger>
          <TabsTrigger value="safebooru">Safe</TabsTrigger>
        </TabsList>
        <TabsContent value="danbooru"><RatingComponent /></TabsContent>
        <TabsContent value="gelbooru"><RatingComponent /></TabsContent>
      </Tabs>
    </div>
    <Separator />
    <div class="form-control">
      <label class="block text-xs font-medium ml-1 mb-2" for="theme-picker">Theme</label>
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
