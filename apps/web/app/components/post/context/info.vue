<script setup lang="ts">
import type { Post, Rating } from '@boorugator/shared/types';

import { Clock, FileBox, HashIcon, ImageDown, LinkIcon, ThumbsUp } from 'lucide-vue-next';

defineProps<{ post: Post }>();

const dayjs = useDayjs();
const userConfig = useUserConfig();

function timeFmt(post: Post) {
  const dateTime = dayjs(post.created_at);
  return [dateTime.isSame(dayjs(), 'week'), dateTime.fromNow(), dateTime.format('YYYY-MM-DD HH:mm')] as const;
}

function toRating(p: Rating) {
  switch (p) {
    case 'e':
      return 'Explicit';
    case 'q':
      return 'Questionable';
    case 's':
      return 'Sensitive';
    default:
      return 'General';
  }
}

function getSourceLink(source: string) {
  if (!source.includes('pximg.net')) return source;
  const id = new URL(source).pathname.split('/').pop()?.split('_')?.at(0);
  if (!id) return source;
  return `https://www.pixiv.net/artworks/${id}`;
}

const toMB = (size: number) => `${(size / 1024 / 1024).toFixed(2)} Mb`;
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex gap-3 items-center">
      <IconGroup :icon="HashIcon" :value="post.id.toString()" textClass="text-sm font-medium" />
      <Badge :variant="['e', 'q'].includes(post.rating) ? 'destructive' : 'outline'">
        {{ toRating(post.rating) }}
      </Badge>
    </div>

    <div class="flex gap-2 items-center">
      <a :href="getSourceLink(post.source)" target="_blank" v-if="post.source">
        <Button size="sm" variant="outline">
          <ImageDown class="size-4" />
          Source
        </Button>
      </a>
      <a :href="createBooruURL(post.id)" target="_blank">
        <Button size="sm" variant="outline">
          <LinkIcon class="size-4" />
          Booru
        </Button>
      </a>
    </div>

    <slot />

    <div class="flex gap-3 items-center">
      <UtilMapObj :fn="timeFmt" :data="post" v-if="post.created_at" v-slot="[sameWeek, relative, full]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconGroup :icon="Clock" :value="sameWeek ? relative : full" />
            </TooltipTrigger>
            <TooltipContent>{{ sameWeek ? full : relative }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </UtilMapObj>
      <IconGroup :icon="FileBox" :value="toMB(post.file_size)" />
      <IconGroup
        :icon="ThumbsUp"
        :value="post.score.toString()"
        :iconClass="post.score < 0 ? 'rotate-180 -scale-x-100' : ''"
        v-if="typeof post.score == 'number'" />
    </div>
  </div>
</template>
