<template>
  <div class="overflow-hidden">
    <div class="columns-2 md:columns-3 xl:columns-4 gap-x-2 md:gap-x-3 lg:gap-x-4 p-2 md:p-3 lg:py-4">
      <div class="inline-block w-full" v-for="_ in 20">
        <Skeleton class="mb-2 md:mb-3 lg:mb-4 rounded-xl" :style="{ height: `${randomInt(20, 50)}dvh` }" />
      </div>
    </div>
  </div>
</template>
