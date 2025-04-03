<script setup lang="ts">
import type { RatingQuery } from 'booru-shared/types';
import type { ComboboxItemEmits } from 'reka-ui';

import { X, Check } from 'lucide-vue-next';

const open = defineModel<boolean>('open', { default: false });
const RATING = <RatingQuery[]>['all', 'g', 's', 'q', 'e'];

const userConfig = useUserConfig();
const cachedRating = ref<RatingQuery[] | undefined>(userConfig.rating);

watchDebounced(cachedRating, (rating) => userConfig.mutate({ rating }), { debounce: 600 });

function handleFilter(...[ev]: ComboboxItemEmits['select']) {
  const rating = <RatingQuery>ev.detail.value;

  if (userConfig.provider !== 'gelbooru') {
    const existing = cachedRating.value ?? [];
    if (rating === 'all') cachedRating.value = ['all'];
    else if (existing[0] === 'all') cachedRating.value = [rating];
    else if (existing.includes(rating)) cachedRating.value = existing.filter((r) => r !== rating);
    else cachedRating.value = [...existing, rating];
    return;
  }

  const [userRating = 'all'] = cachedRating.value ?? [];
  if (rating === 'all') cachedRating.value = undefined;
  else if (rating === userRating) {
    const updatedRating = userRating.startsWith('-') ? rating : <RatingQuery>`-${rating}`;
    cachedRating.value = [updatedRating];
  } else cachedRating.value = [rating];
}

function processRatingEntry(item: RatingQuery): { isSelected: boolean; isInverted: boolean } {
  if (userConfig.provider === 'gelbooru') {
    const [userRating] = cachedRating.value ?? [];
    if (!userRating) return { isSelected: item === 'all', isInverted: false };

    const isSelected = item === userRating || item === userRating.slice(1);
    const isInverted = item === userRating.slice(1);
    return { isSelected, isInverted };
  } else {
    const userRatings = cachedRating.value;
    return {
      isInverted: false,
      isSelected: (item === 'all' && !userRatings) || !!userRatings?.includes(item),
    };
  }
}

const toLabel = (r: RatingQuery) =>
  ({
    g: 'General',
    q: 'Questionable',
    s: 'Sensitive',
    e: 'Explicit',
  })[r.replace('-', '')] || 'All';
</script>

<template>
  <Popover v-model:open="open" class="w-full [&>input]:w-full">
    <PopoverTrigger asChild>
      <Button
        role="combobox"
        variant="outline"
        :aria-expanded="open"
        class="w-full font-normal text-muted-foreground justify-between">
        Filter Content Rating
      </Button>
    </PopoverTrigger>

    <PopoverContent align="start" avoidCollisions class="p-0 max-md:w-[calc(100dvw-2rem)]">
      <Command>
        <CommandList>
          <CommandEmpty />
          <CommandGroup>
            <UtilMapObj
              :key="value"
              v-for="value in RATING"
              :fn="() => processRatingEntry(value)"
              v-slot="{ isSelected, isInverted }">
              <CommandItem
                :value
                :class="[
                  'cursor-pointer md:p-2 max-md:py-3',
                  isInverted && '!bg-red-600/80 hover:!bg-red-600/90',
                  isSelected && !isInverted && '!bg-primary/90 hover:!bg-primary !text-primary-foreground',
                ]"
                @select.prevent="handleFilter">
                <div role="button" class="flex items-center">
                  <X v-if="isInverted" class="w-4 h-4 mr-2" />
                  <Check v-else-if="isSelected" class="w-4 h-4 mr-2" />
                  <div>
                    {{ toLabel(value) }}
                    <strong v-if="value === 'e' || value === 'q'" class="ml-1">NSFW</strong>
                  </div>
                </div>
              </CommandItem>
            </UtilMapObj>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
