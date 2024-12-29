<script setup lang="ts">
import type { ListParams } from '~~/types/common';

import { SlidersHorizontal } from 'lucide-vue-next';

const props = defineProps<{ count?: number; paginator: UsePagination<ListParams> }>();

const { query, update } = props.paginator;

const totalPage = computed(() =>
  Math.ceil((props.count || Number.MAX_SAFE_INTEGER) / (query.value.limit || 50))
);

function updatePage(pageState: 'prev' | 'next' | number) {
  if (pageState !== 'prev') setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  if (typeof pageState == 'number') return update({ page: pageState });

  const qValue = query.value.page;
  if (isNaN(+qValue)) update({ page: 1 });
  else update({ page: pageState == 'prev' ? qValue - 1 : qValue + 1 });
}
</script>

<template>
  <Card class="flex justify-between items-center p-2 gap-2 max-w-lg mx-auto bg-card/80 backdrop-blur-lg">
    <Pagination :page="query.page" :total="totalPage" :siblingCount="2" @update:page="updatePage($event)">
      <template #default="{ page }">
        <PaginationList v-slot="{ items }" class="flex items-center gap-1">
          <PaginationPrev />

          <template v-if="typeof count == 'number'" v-for="(item, index) in items">
            <PaginationListItem v-if="item.type === 'page'" :key="index" :value="item.value" as-child>
              <Button class="w-10 h-10 p-0" :variant="item.value === page ? 'default' : 'outline'">
                {{ item.value }}
              </Button>
            </PaginationListItem>
            <PaginationEllipsis v-else :key="item.type" :index="index" />
          </template>
          <div class="font-medium mx-4" v-else>Page {{ query.page }}</div>

          <PaginationNext />
          <Popover>
            <PopoverTrigger>
              <Button variant="ghost"><SlidersHorizontal class="w-5 h-5" /></Button>
            </PopoverTrigger>
            <PopoverContent :sideOffset="12" align="end" class="w-64">
              <div class="form-control">
                <label class="block font-medium text-sm mb-2.5 ml-1">Limit</label>
                <Select
                  :modelValue="`${query.limit || '50'}`"
                  @update:modelValue="update({ limit: +$event })">
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
        </PaginationList>
      </template>
    </Pagination>
  </Card>
</template>
