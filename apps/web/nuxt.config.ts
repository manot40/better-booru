import tailwind from '@tailwindcss/vite';

const CDN_URL = process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT;

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  app: {
    cdnURL: CDN_URL || undefined,
    buildAssetsDir: 'web_assets',
  },

  compatibilityDate: '2026-03-01',

  future: {
    compatibilityVersion: 5,
  },

  experimental: {
    inlineRouteRules: true,
    nitroAutoImports: true,
  },

  sourcemap: {
    client: 'hidden',
  },

  vite: {
    plugins: [tailwind()],
    optimizeDeps: {
      include: [
        'dayjs', // CJS
        'dayjs/plugin/updateLocale', // CJS
        'dayjs/plugin/relativeTime', // CJS
        'dayjs/plugin/utc', // CJS
        'dayjs/plugin/timezone', // CJS
        'lucide-vue-next',
        'photoswipe',
        'photoswipe/lightbox',
        '@tanstack/vue-virtual',
        'class-variance-authority',
        '@elysiajs/eden',
        'clsx',
        'tailwind-merge',
        'reka-ui',
        'vaul-vue',
      ],
    },
  },

  nitro: {
    preset: 'static',
  },

  runtimeConfig: {
    public: {
      cdnUrl: CDN_URL || undefined,
      baseUrl: import.meta.env.BASE_URL || '',
    },
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
