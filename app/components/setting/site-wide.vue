<script setup lang="ts">
import type { UserConfig } from '~~/types/common';

import { Sun, Moon, SwatchBook } from 'lucide-vue-next';

const HEADER = ['User Configuration', 'Data source and site-wide experience configuration'] as const;

const open = defineModel('open', { default: false });

const colorMode = useColorMode();
const isDesktop = useMediaQuery('(min-width: 768px)');
const userConfig = useUserConfig();

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
  get: () => userConfig.browseMode === 'infinite',
  set: (e) => userConfig.mutate({ browseMode: e ? 'infinite' : 'paginated' }),
});

const blurNSFW = computed({
  get: () => userConfig.hideNSFW,
  set: (e) => userConfig.mutate({ hideNSFW: e }),
});
</script>

<template>
  <RatingTemplate>
    <div class="flex items-end gap-4 mt-4">
      <div class="form-control flex-1">
        <Label class="block mb-2 text-xs" for="rating-picker">Rating</Label>
        <RatingPicker />
      </div>
      <div class="flex items-center space-x-2 shrink-0 mb-2">
        <Switch v-model="blurNSFW" id="blur-nsfw" />
        <Label for="blur-nsfw">Blur NSFW</Label>
      </div>
    </div>
  </RatingTemplate>

  <ContentTemplate>
    <div class="form-control">
      <Label class="block mb-2 text-xs">Booru Source</Label>
      <Tabs v-model="provider">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="danbooru">Dan</TabsTrigger>
          <TabsTrigger value="safebooru">Safe</TabsTrigger>
          <TabsTrigger value="gelbooru">Gel</TabsTrigger>
        </TabsList>
        <TabsContent value="danbooru"><RatingComponent /></TabsContent>
        <TabsContent value="gelbooru"><RatingComponent /></TabsContent>
      </Tabs>
    </div>
    <Separator class="mt-2 mb-0.5" />

    <div class="flex items-end gap-4 mb-1.5">
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

  <Dialog v-if="isDesktop" v-model:open="open">
    <DialogContent class="max-w-md">
      <DialogHeader class="mb-3">
        <DialogTitle>{{ HEADER[0] }}</DialogTitle>
        <DialogDescription>{{ HEADER[1] }}</DialogDescription>
      </DialogHeader>
      <div class="grid gap-2.5"><ContentComponent /></div>
    </DialogContent>
  </Dialog>

  <Drawer v-else v-model:open="open">
    <DrawerContent>
      <DrawerHeader class="text-left">
        <DrawerTitle>{{ HEADER[0] }}</DrawerTitle>
        <DrawerDescription>{{ HEADER[1] }}</DrawerDescription>
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
