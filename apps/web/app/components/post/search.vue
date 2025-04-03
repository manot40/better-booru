<script setup lang="ts">
import type { ComboboxItemEmits } from 'reka-ui';

import { STORE_KEY } from '~/lib/query-store';

defineOptions({ inheritAttrs: false });
const open = defineModel<boolean>('open');

const isDesktop = useMediaQuery('(min-width: 768px)');
const userConfig = useUserConfig();

const [UseTriggerTemplate, Trigger] = createReusableTemplate();
const [UseTagsListTemplate, TagsList] = createReusableTemplate();
const [UseContentTemplate, Content] = createReusableTemplate();

const searchTerm = ref('');
const queryState = useState<{ tags?: string }>(STORE_KEY);
const tags = computed(() => queryState.value?.tags?.split(' ') || []);

const q = debouncedRef(searchTerm, 600);
const query = computed(() => ({ q: q.value }));
const { data: searchTags } = useLazyFetch('/api/autocomplete', {
  query,
  server: false,
  watch: [() => userConfig.provider],
  headers: { 'x-provider': userConfig.provider },
});

const filtered = computed(() => searchTags.value?.filter((a) => !tags.value.includes(a.value)) || []);

function handleFilter(...[ev]: ComboboxItemEmits['select']) {
  const exclude = (<HTMLElement>ev.target).innerHTML === 'Exclude';
  const value = exclude ? `-${ev.detail.value}` : ev.detail.value;
  if (typeof value == 'string')
    updateQuery(tags.value.includes(value) ? tags.value.filter((a) => a !== value) : [...tags.value, value]);
}

const updateQuery = useThrottleFn((tagList: string[]) => {
  const tags = tagList.join(' ');
  if (userConfig.historyMode == 'url_query') navigateTo({ name: 'index', query: { tags } });
  else queryState.value = { ...queryState.value, tags };
}, 300);
</script>

<template>
  <UseTriggerTemplate>
    <Button variant="outline" class="font-normal gap-8 max-md:pr-20 text-muted-foreground max-w-lg">
      <span>{{ tags.length ? `${pluralify('tag', tags.length)} applied` : 'Search by Tags' }}</span>
      <p class="text-sm text-muted-foreground shrink-none max-md:hidden">
        <kbd
          class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span class="text-xs">⌘</span>
          <span class="text-sm">K</span>
        </kbd>
      </p>
    </Button>
  </UseTriggerTemplate>

  <UseTagsListTemplate>
    <TagsInput
      :modelValue="tags"
      @removeTag="updateQuery(tags.filter((a) => a !== $event))"
      class="font-normal rounded-b-none border-0 border-b py-2.5 bg-inherit">
      <TagsInputItem
        v-for="tag in tags"
        :key="tag"
        :value="tag"
        :class="['rounded-sm py-3', tag.startsWith('-') && 'bg-red-900']">
        <div class="ml-2 mr-1 mb-1">{{ tag.replace(/^-/, '') }}</div>
        <TagsInputItemDelete />
      </TagsInputItem>
    </TagsInput>
  </UseTagsListTemplate>

  <UseContentTemplate>
    <Command :modelValue="tags" v-bind="$attrs">
      <CommandInput placeholder="Search Tags..." v-model="searchTerm" />
      <TagsList v-if="tags.length" />
      <div class="px-4 py-6 text-center text-sm" v-if="!searchTerm">Type tags name in searchbar</div>
      <CommandList v-else>
        <CommandEmpty>Tags not found</CommandEmpty>
        <CommandGroup class="gap-1.5">
          <CommandItem
            :key="item.value"
            :value="item.value"
            class="cursor-pointer px-3 py-2"
            v-for="item in filtered"
            @select.prevent="handleFilter">
            <div class="flex items-center justify-between gap-2 w-full">
              <div class="flex gap-2 items-center">
                {{ startCase(item.label) }}

                <component
                  :is="getIconFromCategory(item.category)"
                  class="inline w-3 h-3 ml-0.5 mt-px"
                  v-if="typeof item.category == 'string' && item.category != 'tag'" />
              </div>
              <Badge variant="destructive">Exclude</Badge>
            </div>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </UseContentTemplate>

  <Dialog v-if="isDesktop" v-model:open="open">
    <DialogTrigger asChild><Trigger /></DialogTrigger>
    <DialogContent class="p-0">
      <DialogDescription hidden />
      <DialogTitle hidden>Tags List</DialogTitle>
      <Content />
    </DialogContent>
  </Dialog>

  <Drawer v-else v-model:open="open">
    <DrawerTrigger asChild><Trigger /></DrawerTrigger>
    <DrawerContent>
      <DrawerDescription hidden />
      <DrawerTitle hidden>Tags List</DrawerTitle>
      <Content />
    </DrawerContent>
  </Drawer>
</template>
