<script setup lang="ts">
import type { ComboboxItemEmits } from 'radix-vue';

import { debounce } from 'perfect-debounce';

const open = defineModel<boolean>('open');

const route = useRoute();
const router = useRouter();
const isDesktop = useMediaQuery('(min-width: 768px)');

const [UseTriggerTemplate, Trigger] = createReusableTemplate();
const [UseContentTemplate, Content] = createReusableTemplate();

const tags = ref((<string | undefined>route.query.tags)?.split(' ') || []);
const searchTerm = ref('');

const q = debouncedRef(searchTerm, 600);
const query = computed(() => ({ q: q.value }));
const { data: searchTags } = useFetch('/api/autocomplete', { query });

const filtered = computed(() => searchTags.value?.filter((a) => !tags.value.includes(a.value)) || []);

function handleFilter(...[ev]: ComboboxItemEmits['select']) {
  const value = ev.detail.value;
  if (typeof value != 'string') return;
  if (tags.value.includes(value)) tags.value.splice(tags.value.indexOf(value), 1);
  else tags.value.push(value);
  updateQuery(tags.value);
}

const updateQuery = debounce((tags: string[]) => {
  navigateTo({ name: 'index', query: { tags: tags.join(' ') } });
}, 600);

const unsub = router.afterEach(({ query }) => {
  const qTags = (<string | undefined>query.tags)?.split(' ');
  if (!qTags) tags.value.length > 0 && (tags.value = []);
  else if (qTags.length != tags.value.length && qTags.every((a) => tags.value.includes(a))) {
    tags.value = qTags;
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
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

  <UseContentTemplate>
    <Command v-bind="$attrs" v-model:searchTerm="searchTerm">
      <CommandInput placeholder="Search Tags..." />
      <!-- <div class="px-3 py-2 text-sm">
        <div class="font-medium">Selected Tags</div>
      </div>
      <CommandSeparator /> -->
      <CommandList>
        <CommandEmpty>Type tags name in searchbar</CommandEmpty>
        <CommandGroup>
          <CommandItem
            :key="item.value"
            :value="item.value"
            class="cursor-pointer"
            v-for="item in filtered"
            @select.prevent="handleFilter">
            <div class="flex items-center justify-between gap-2 w-full">
              {{ startCase(item.label) }}
              <Badge
                :variant="item.category === 'copyright' ? 'default' : 'outline'"
                v-if="typeof item.category == 'string' && item.category != 'tag'">
                {{ startCase(item.category) }}
              </Badge>
            </div>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </UseContentTemplate>

  <Dialog v-if="isDesktop" v-model:open="open">
    <DialogTrigger asChild><Trigger /></DialogTrigger>
    <DialogContent class="p-0"><Content /></DialogContent>
  </Dialog>

  <Drawer v-else v-model="open">
    <DrawerTrigger asChild><Trigger /></DrawerTrigger>
    <DrawerContent><Content /></DrawerContent>
  </Drawer>
</template>
