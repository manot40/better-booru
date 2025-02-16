<script setup lang="ts">
import type { RatingQuery } from '~~/types/common';

import { X, Check } from 'lucide-vue-next';

import {
  ComboboxPortal,
  ComboboxContent,
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  type ComboboxItemEmits,
} from 'radix-vue';

const open = defineModel<boolean>('open');
const RATING = <RatingQuery[]>['all', 'general', 'sensitive', 'questionable', 'explicit'];

const userConfig = useUserConfig();
const cachedRating = ref<RatingQuery[] | undefined>(userConfig.rating);

watchDebounced(cachedRating, (rating) => userConfig.mutate({ rating }), { debounce: 600 });

function handleFilter(...[ev]: ComboboxItemEmits['select']) {
  const rating = <RatingQuery>ev.detail.value;

  if (userConfig.provider === 'danbooru') {
    const userRatings = cachedRating.value ?? [];
    if (rating === 'all') return (cachedRating.value = ['all']);
    else if (userRatings.includes(rating))
      return (cachedRating.value = userRatings.filter((r) => r !== rating));
    return (cachedRating.value = [...userRatings, rating]);
  }

  const [userRating = 'all'] = cachedRating.value ?? [];
  if (rating === 'all') cachedRating.value = undefined;
  else if (rating === userRating) {
    const updatedRating = userRating.startsWith('-') ? rating : <RatingQuery>`-${rating}`;
    cachedRating.value = [updatedRating];
  } else cachedRating.value = [rating];
}

function processRatingEntry(item: RatingQuery): { isSelected: boolean; isInverted: boolean } {
  if (userConfig.provider === 'danbooru') {
    const userRatings = cachedRating.value;
    return {
      isInverted: false,
      isSelected: (item === 'all' && !userRatings) || !!userRatings?.includes(item),
    };
  } else {
    const [userRating] = cachedRating.value ?? [];
    if (!userRating) return { isSelected: item === 'all', isInverted: false };

    const isSelected = item === userRating || item === userRating.slice(1);
    const isInverted = item === userRating.slice(1);
    return { isSelected, isInverted };
  }
}
</script>

<template>
  <ComboboxRoot v-model:open="open" class="w-full [&>input]:w-full">
    <ComboboxAnchor asChild>
      <ComboboxInput placeholder="Filter Content Rating" asChild>
        <Input readonly @keydown.prevent @click="open = !open" class="cursor-default" />
      </ComboboxInput>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent>
        <CommandList
          avoidCollisions
          position="popper"
          :class="[
            'z-50 w-[--radix-popper-anchor-width] rounded-md mt-2 border bg-popover text-popover-foreground shadow-md outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          ]">
          <CommandEmpty />
          <CommandGroup>
            <UtilMapObj
              :key="item"
              v-for="item in RATING"
              :fn="() => processRatingEntry(item)"
              v-slot="{ result: { isSelected, isInverted } }">
              <CommandItem
                :value="item"
                :class="{
                  '!bg-red-600/80 hover:!bg-red-600/90': isInverted,
                  '!bg-primary/90 hover:!bg-primary !text-primary-foreground': isSelected && !isInverted,
                }"
                @select.prevent="handleFilter">
                <div class="flex items-center">
                  <X v-if="isInverted" class="w-4 h-4 mr-2" />
                  <Check v-else-if="isSelected" class="w-4 h-4 mr-2" />
                  <div>
                    {{ startCase(item) }}
                    <strong v-if="item === 'explicit' || item === 'questionable'" class="ml-1">NSFW</strong>
                  </div>
                </div>
              </CommandItem>
            </UtilMapObj>
          </CommandGroup>
        </CommandList>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
