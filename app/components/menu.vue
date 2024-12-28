<script setup lang="ts">
import type { Provider } from '~~/types/common';

import { Sun, Moon, SwatchBook, Menu } from 'lucide-vue-next';

const colorMode = useColorMode();
const isDesktop = useMediaQuery('(min-width: 768px)');
const userConfig = useUserConfig();

const drawerOpen = ref(false);

const [TriggerTemplate, Trigger] = createReusableTemplate();
const [ContentTemplate, Content] = createReusableTemplate();
</script>

<template>
  <TriggerTemplate>
    <Button variant="ghost" class="w-10 h-10 p-0">
      <Menu class="w-8 h-8" />
    </Button>
  </TriggerTemplate>

  <ContentTemplate>
    <div>
      <div class="block text-xs font-medium ml-1 mb-2">Data Source</div>
      <Tabs
        :modelValue="userConfig.provider"
        @update:modelValue="userConfig.mutate({ provider: <Provider>$event })">
        <TabsList class="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="gelbooru">Gelbooru</TabsTrigger>
          <TabsTrigger value="safebooru">Safebooru</TabsTrigger>
        </TabsList>
        <TabsContent value="gelbooru">
          <div class="form-control">
            <label class="block text-xs font-medium ml-1 mb-2" for="rating-picker">Rating</label>
            <RatingPicker />
          </div>
        </TabsContent>
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
    <PopoverTrigger as-child><Trigger /></PopoverTrigger>
    <PopoverContent class="w-80">
      <div class="grid gap-2.5">
        <Content />
      </div>
    </PopoverContent>
  </Popover>

  <Drawer v-else v-model:open="drawerOpen">
    <DrawerTrigger as-child><Trigger /></DrawerTrigger>
    <DrawerContent>
      <DrawerHeader class="text-left">
        <DrawerTitle>User Configuration</DrawerTitle>
        <DrawerDescription>Data source and site-wide experience configuration</DrawerDescription>
      </DrawerHeader>
      <div class="grid gap-3 px-4 my-4">
        <Content />
      </div>
      <DrawerFooter class="pt-2">
        <DrawerClose as-child>
          <Button variant="outline">Dismiss</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
