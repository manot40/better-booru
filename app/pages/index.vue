<script setup lang="ts">
import 'photoswipe/style.css';

import { SquareArrowOutUpRight, LoaderCircle, Bean, Angry } from 'lucide-vue-next';

definePageMeta({
  middleware() {
    const nuxt = useNuxtApp();
    const ucfg = useUserConfig();
    if (import.meta.server || nuxt.isHydrating) ucfg.populate();
  },
});

const userConfig = useUserConfig();
const { data, error, loading, paginator } = useBooruFetch();

const container = shallowRef<HTMLElement>();
const { lightbox, rendered } = useLightbox(container);

const gap = 8;
const masonry = useTemplateRef('masonry');
function estimateSize(index: number, lane: number) {
  const item = data.value?.post[index];
  if (!item) return 0;

  const [x, y] = imageAspectRatio(item.width, item.height);
  const widthPerLane = +(window.innerWidth / lane) - gap;
  const relWidth = widthPerLane / x;
  const relHeight = Math.round(relWidth * y);

  return relHeight > 900 ? 900 : relHeight;
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
  <EmptyState :icon="Angry" title="Ouch..." class="py-8 px-4 h-[80dvh]" v-if="error">
    <p>Something definitely wrong.</p>
  </EmptyState>
  <PostListSkeleton v-else-if="!data" />
  <VirtualMasonry
    :gap
    :estimateSize
    :count="data.post.length"
    :containerRef="(el) => (container = <HTMLElement>el)"
    ref="masonry"
    class="overflow-auto px-1 lg:px-2 mt-1.5 lg:mt-3"
    v-else-if="data.post.length > 0">
    <template #default="{ row }">
      <div class="rounded-xl overflow-hidden shadow-sm border border-neutral-50 dark:border-transparent">
        <UtilMapObj :data="data.post" :fn="(p) => p[row.index]!" v-slot="{ result: item }">
          <PostListItemImage :item v-if="!['webm', 'mp4'].includes(item.file_ext)" />
          <PostListItemVideo :item v-else />
        </UtilMapObj>
      </div>
    </template>
  </VirtualMasonry>
  <EmptyState title="Nothing Found" :icon="Bean" class="py-8 px-4 h-[80dvh]" v-else>
    <p>Try searching for something else or readjust your tags.</p>
  </EmptyState>

  <template v-if="data?.post.length">
    <Teleport to=".bottom-bar" v-if="!userConfig.isInfinite">
      <PostFilter :count="data.meta.count" :paginator />
    </Teleport>
    <EmptyState
      :icon="LoaderCircle"
      class="py-8 px-4"
      iconClass="animate-spin w-8 h-8 !mb-3"
      v-else-if="loading">
      <p>Loading more image for you... Hang tight.</p>
    </EmptyState>
  </template>

  <Teleport to=".pswp__open" v-if="rendered"><SquareArrowOutUpRight class="w-5 h-5 mx-auto" /></Teleport>
</template>
