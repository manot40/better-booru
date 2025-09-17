import tailwindcss from '@tailwindcss/vite';

const CDN_URL = process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT;

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  app: {
    cdnURL: CDN_URL || undefined,
    buildAssetsDir: 'web_assets',
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-08-20',

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
    public: { baseUrl: '', cdnUrl: CDN_URL || undefined },
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
