<script setup lang="ts">
import { VisuallyHidden, type ComboboxItemEmits } from 'reka-ui';

import { debounce } from 'perfect-debounce';

defineOptions({ inheritAttrs: false });
const open = defineModel<boolean>('open');

const route = useRoute();
const router = useRouter();
const isDesktop = useMediaQuery('(min-width: 768px)');
const userConfig = useUserConfig();

const [UseTriggerTemplate, Trigger] = createReusableTemplate();
const [UseTagsListTemplate, TagsList] = createReusableTemplate();
const [UseContentTemplate, Content] = createReusableTemplate();

const tags = computed(() => (route.query.tags && (<string>route.query.tags).split(' ')) || []);
const searchTerm = ref('');

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
  if (typeof value != 'string') return;
  updateQuery(tags.value.includes(value) ? tags.value.filter((a) => a !== value) : [...tags.value, value]);
}

const updateQuery = debounce((tags: string[]) => {
  navigateTo({ name: 'index', query: { tags: tags.join(' ') } });
}, 600);

const unsub = router.afterEach(({ query }) => {
  const qTags = (<string | undefined>query.tags)?.split(' ');
  if (!qTags) tags.value.length > 0 && updateQuery([]);
  else if (qTags.length != tags.value.length && qTags.every((a) => tags.value.includes(a))) {
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 100);
  }
});

onUnmounted(unsub);
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
      class="font-normal rounded-b-none border-0 border-b py-2.5">
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
        <CommandGroup>
          <CommandItem
            :key="item.value"
            :value="item.value"
            class="cursor-pointer"
            v-for="item in filtered"
            @select.prevent="handleFilter">
            <div class="flex items-center justify-between gap-2 w-full">
              <div class="flex gap-2 items-center">
                {{ startCase(item.label) }}
                <Badge
                  :variant="item.category === 'copyright' ? 'default' : 'outline'"
                  v-if="typeof item.category == 'string' && item.category != 'tag'">
                  {{ startCase(item.category) }}
                </Badge>
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
