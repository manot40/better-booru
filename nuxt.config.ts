// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2025-03-01',

  runtimeConfig: {
    gelbooruUserId: '',
    gelbooruApiKey: '',
    danbooruUserId: '',
    danbooruApiKey: '',
  },

  modules: [
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'nuxt-ipx-cache',
    'shadcn-nuxt',
  ],

  image: {
    format: ['webp', 'jpg'],
    ipx: { modifiers: { format: 'webp' } },
    domains: ['img3.gelbooru.com', 'cdn.donmai.us'],
    alias: {
      danbooru: 'https://cdn.donmai.us',
      gelbooru: 'https://img3.gelbooru.com',
    },
  },

  ipxCache: { maxAge: 60 * 60 * 24 * 7 },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  colorMode: {
    storage: 'cookie',
    fallback: 'dark',
  },

  $production: {
    routeRules: {
      '/': { prerender: true },
      '/api/**': {
        cache: {
          swr: false,
          maxAge: 60 * 5,
          varies: ['x-provider', 'x-rating'],
        },
      },
      '/api/note/**': { swr: false, cache: false },
    },
  },
});
