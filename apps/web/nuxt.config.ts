import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2025-08-20',

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

  runtimeConfig: {
    public: { baseUrl: '' },
  },

  modules: ['@nuxtjs/color-mode', '@pinia/nuxt', '@vueuse/nuxt', 'dayjs-nuxt', 'shadcn-nuxt'],

  dayjs: {
    plugins: ['relativeTime', 'utc', 'timezone'],
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
