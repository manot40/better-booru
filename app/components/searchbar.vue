<script setup lang="ts">
import { debounce } from 'perfect-debounce';

import {
  ComboboxPortal,
  ComboboxContent,
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  type ComboboxItemEmits,
} from 'radix-vue';

const route = useRoute();
const router = useRouter();

const open = ref(false);
const tags = ref((<string | undefined>route.query.tags)?.split('+') || []);
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
  navigateTo({
    name: 'index',
    query: { tags: tags.join('+') },
  });
}, 600);

const unsub = router.afterEach(({ query }) => {
  const qTags = (<string | undefined>query.tags)?.split('+');
  if (qTags && qTags.length != tags.value.length && qTags.every((a) => tags.value.includes(a)))
    tags.value = qTags;
});

onUnmounted(unsub);
</script>

<template>
  <TagsInput v-model="tags" @update:modelValue="updateQuery(<string[]>$event)">
    <div
      class="flex gap-2 flex-wrap items-center max-h-8 md:max-h-16 overflow-y-auto"
      v-show="tags.length > 0">
      <TagsInputItem v-for="item in tags" :key="item" :value="item">
        <TagsInputItemText class="text-xs" />
        <TagsInputItemDelete />
      </TagsInputItem>
    </div>

    <ComboboxRoot v-model="tags" v-model:open="open" v-model:searchTerm="searchTerm" class="w-full">
      <ComboboxAnchor as-child>
        <ComboboxInput placeholder="Search..." as-child>
          <TagsInputInput @keydown.enter.prevent />
        </ComboboxInput>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent>
          <CommandList
            side="top"
            position="popper"
            class="w-[--radix-popper-anchor-width] rounded-md mt-2 border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
            <CommandEmpty />
            <CommandGroup>
              <CommandItem
                :key="item.value"
                :value="item.value"
                v-for="item in filtered"
                @select.prevent="handleFilter">
                {{ item.label }}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
  </TagsInput>
</template>
