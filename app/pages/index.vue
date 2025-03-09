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
const { post, meta, error, paginator } = useBooruFetch();

const dataSource = computed(() => {
  if (!post.value) return [];
  return post.value.map((item) => ({
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
  const item = post.value?.[index];
  if (!item) return 0;

  const [x, y] = imageAspectRatio(item.width, item.height);
  const widthPerLane = +(window.innerWidth / lane) - gap;
  const relativeWidth = widthPerLane / x;
  return Math.ceil(relativeWidth * y);
}

watch(post, () => masonry.value?.virtualizer.measure());
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
  <div class="grid text-center place-content-center py-8 px-4 h-[80dvh]" v-if="error">
    <Angry class="w-14 h-14 mx-auto mb-8" />
    <h2 class="text-2xl font-semibold mb-2.5">Ouch...</h2>
    <p>Something definitely wrong.</p>
  </div>
  <PostListSkeleton v-else-if="!post" />
  <VirtualMasonry
    :gap
    :estimateSize
    :count="post.length"
    ref="masonry"
    class="overflow-auto px-1 lg:px-2 mt-1.5 lg:mt-3"
    v-else-if="post.length > 0">
    <template #default="{ row }">
      <div class="rounded-xl overflow-hidden">
        <UtilMapObj :data="post" :fn="(p) => p[row.index]!" v-slot="{ result: item }">
          <PostListItemImage
            :item
            @click="lightbox?.loadAndOpen(row.index)"
            v-if="!['webm', 'mp4'].includes(item.file_ext)" />
          <PostListItemVideo :item v-else />
        </UtilMapObj>
      </div>
    </template>
  </VirtualMasonry>
  <div class="grid text-center place-content-center py-8 px-4 h-[80dvh]" v-else>
    <Bean class="w-14 h-14 mx-auto mb-8" />
    <h2 class="text-2xl font-semibold mb-2.5">Nothing Found</h2>
    <p>Try searching for something else or readjust your tags.</p>
  </div>

  <template v-if="post?.length">
    <div v-if="userConfig.isInfinite" class="grid place-content-center py-8 px-4">
      <LoaderCircle class="animate-spin w-8 h-8 mx-auto mb-3" />
      <p>Loading more image for you... Hang tight.</p>
    </div>
    <Teleport to=".bottom-bar" v-else><PostFilter :count="meta?.count" :paginator /></Teleport>
  </template>

  <Teleport to=".pswp__open" v-if="rendered"><SquareArrowOutUpRight class="w-5 h-5 mx-auto" /></Teleport>
</template>
