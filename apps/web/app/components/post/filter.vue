<script setup lang="ts">
import type { ListParams } from '@boorugator/shared/types';

import { ChevronLeft, SlidersHorizontal } from 'lucide-vue-next';

const props = defineProps<{ count?: number; paginator: UsePagination<ListParams> }>();

const { query, update } = props.paginator;

const page = computed({
  get: () => query.value.page,
  set(state: 'prev' | 'next' | number) {
    if (state !== 'prev') setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 300);
    if (typeof state == 'number') return update({ page: state });

    const qValue = query.value.page;
    if (isNaN(+qValue)) update({ page: 1 });
    else update({ page: state == 'prev' ? qValue - 1 : qValue + 1 });
  },
});
</script>

<template>
  <Card class="!flex justify-between items-center p-2 gap-2 max-w-lg mx-auto bg-card/80 backdrop-blur-lg">
    <Pagination :total="count" :siblingCount="2" v-model:page="page" :itemsPerPage="query.limit || 50">
      <template #default="{ page }">
        <PaginationContent v-slot="{ items }" class="flex items-center gap-1">
          <PaginationPrevious><ChevronLeft class="w-5 h-5" /></PaginationPrevious>

          <template v-if="typeof count == 'number'" v-for="(item, index) in items">
            <PaginationItem v-if="item.type === 'page'" :key="index" :value="item.value" as-child>
              <Button class="w-10 h-10 p-0" :variant="item.value === page ? 'default' : 'outline'">
                {{ item.value }}
              </Button>
            </PaginationItem>
            <PaginationEllipsis v-else :key="item.type" :index="index" />
          </template>
          <div class="font-medium mx-4" v-else>Page {{ query.page }}</div>

          <PaginationNext><ChevronLeft class="w-5 h-5 -scale-x-100" /></PaginationNext>
          <Popover>
            <PopoverTrigger>
              <Button variant="ghost"><SlidersHorizontal class="w-5 h-5" /></Button>
            </PopoverTrigger>
            <PopoverContent :sideOffset="12" align="end" class="w-64">
              <div class="form-control">
                <label class="block font-medium text-sm mb-2.5 ml-1">Limit</label>
                <Select
                  :modelValue="`${query.limit || '50'}`"
                  @update:modelValue="typeof $event !== 'object' && update({ limit: Number($event) })">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Post per page" />
                    <SelectContent>
                      <SelectItem :key="value" :value v-for="value in ['20', '50', '80', '100']">
                        {{ value }}
                      </SelectItem>
                    </SelectContent>
                  </SelectTrigger>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
        </PaginationContent>
      </template>
    </Pagination>
  </Card>
</template>
