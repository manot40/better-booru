<script setup lang="ts">
import type { ComboboxItemEmits } from 'reka-ui';

import { STORE_KEY } from '~/lib/query-store';

defineOptions({ inheritAttrs: false });
const open = defineModel<boolean>('open');

const userConfig = useUserConfig();
const provider = toRef(userConfig, 'provider');

const searchTerm = ref('');
const queryState = useState<{ tags?: string }>(STORE_KEY);
const tags = computed(() => queryState.value?.tags?.split(' ') || []);

const q = debouncedRef(searchTerm, 600);
const { data: searchTags } = useAsyncData(q, fetchAutocomplete, { server: false, watch: [provider] });
async function fetchAutocomplete() {
  const headers = { 'x-provider': provider.value };
  const { data, error } = await eden.api.autocomplete.get({ query: { q: q.value }, headers });
  if (data) return data as Array<Record<'value' | 'label', string> & { category: number }>;
  throw error;
}

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
  <Dialog v-model:open="open">
    <DialogTrigger>
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
    </DialogTrigger>

    <DialogContent class="p-0 bg-popover/60 backdrop-blur-lg">
      <DialogDescription hidden />
      <DialogTitle hidden>Tags List</DialogTitle>
      <Command :modelValue="tags" v-bind="$attrs" class="bg-inherit">
        <CommandInput placeholder="Search Tags..." v-model="searchTerm" />

        <TagsInput
          v-if="tags.length"
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
    </DialogContent>
  </Dialog>
</template>
