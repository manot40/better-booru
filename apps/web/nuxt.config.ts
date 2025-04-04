import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2025-03-01',

  css: ['~/assets/css/main.css'],

  future: {
    compatibilityVersion: 4,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  nitro: {
    preset: 'static',
  },

  modules: ['@nuxt/image', '@nuxtjs/color-mode', '@pinia/nuxt', '@vueuse/nuxt', 'shadcn-nuxt'],

  image: {
    format: ['webp', 'jpg'],
    ipx: { modifiers: { format: 'webp' } },
    domains: ['img3.gelbooru.com', 'cdn.donmai.us'],
    alias: {
      danbooru: 'https://cdn.donmai.us',
      gelbooru: 'https://img3.gelbooru.com',
    },
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  colorMode: {
    storage: 'cookie',
    fallback: 'dark',
  },
});
