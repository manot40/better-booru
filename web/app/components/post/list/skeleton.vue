<template>
  <div class="overflow-hidden">
    <div class="columns-2 md:columns-3 2xl:columns-4 gap-x-2 p-2 md:p-3">
      <div class="inline-block w-full" v-for="_ in 20">
        <Skeleton class="mb-2 rounded-xl" :style="{ height: `${randomInt(20, 50)}dvh` }" />
      </div>
    </div>
  </div>
</template>
