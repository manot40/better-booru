<script setup lang="ts">
import type { ListParams } from '~~/types/common';

import 'photoswipe/style.css';

import { SquareArrowOutUpRight } from 'lucide-vue-next';

definePageMeta({
  middleware() {
    const nuxt = useNuxtApp();
    const ucfg = useUserConfig();
    if (import.meta.server || nuxt.isHydrating) ucfg.populate();
  },
});

const userConfig = useUserConfig();

const headers = computed(() => ({
  'x-rating': userConfig.rating?.join(' ') || '',
  'x-provider': userConfig.provider,
}));
const paginator = usePaginationQuery<ListParams>();
const { data, error, status } = useLazyFetch('/api/post', { server: false, query: paginator.query, headers });

const dataSource = computed(() => {
  if (!data.value) return [];
  return data.value.post.map((item) => ({
    alt: item.tags,
    src: item.file_url,
    width: item.width,
    height: item.height,
  }));
});
const { lightbox, rendered } = useLightbox(dataSource);

const gap = 8;
const masonry = useTemplateRef('masonry');
function estimateSize(index: number, lane: number) {
  const item = data.value?.post[index];
  if (!item) return 0;

  const [x, y] = imageAspectRatio(item.width, item.height);
  const widthPerLane = +(window.innerWidth / lane) - gap;
  const relativeWidth = widthPerLane / x;
  return Math.ceil(relativeWidth * y);
}

watch(data, () => masonry.value?.virtualizer.measure());
onMounted(() => {
  lightbox.value?.on('loadError', function ({ content, slide }) {
    const el = <HTMLAnchorElement>content.data.element;
    const src = '/image?proxy=' + content.data.src;
    if (content.data.proxied || el.dataset.proxied) return;

    el.dataset.pswpSrc = src;
    el.dataset.proxied = 'true';
    content.data = { ...content.data, src, proxied: true };
    slide.pswp.refreshSlideContent(slide.index);
  });
});
</script>

<template>
  <PostListSkeleton v-if="isPend(status)" />
  <div v-else-if="error"></div>
  <VirtualMasonry
    :gap
    :estimateSize
    :count="data.post.length"
    ref="masonry"
    class="overflow-auto px-1 lg:px-2 mt-1.5 lg:mt-3"
    v-else-if="data?.post.length">
    <template #default="{ row }">
      <div class="rounded-xl overflow-hidden">
        <UtilMapObj :data :fn="(d) => d.post[row.index]!" v-slot="{ result: item }">
          <PostListItemImage
            :item
            @click="lightbox?.loadAndOpen(row.index)"
            v-if="!['webm', 'mp4'].includes(item.file_ext)" />
          <PostListItemVideo :item v-else />
        </UtilMapObj>
      </div>
    </template>
  </VirtualMasonry>
  <div class="" v-else></div>

  <Teleport to=".pswp__open" v-if="rendered"><SquareArrowOutUpRight class="w-5 h-5 mx-auto" /></Teleport>
  <Teleport to=".bottom-bar"><PostFilter :count="data?.meta?.count" :paginator /></Teleport>
</template>
