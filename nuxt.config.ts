// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2024-12-25',

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
    'shadcn-nuxt',
  ],

  image: {
    format: ['webp', 'jpg'],
    ipx: { modifiers: { format: 'webp' } },
    domains: ['safebooru.org', 'img3.gelbooru.com', 'cdn.donmai.us'],
    alias: {
      danbooru: 'https://cdn.donmai.us',
      gelbooru: 'https://img3.gelbooru.com',
      safebooru: 'https://safebooru.org',
    },
  },

  ipxCache: { maxAge: 60 * 60 * 24 * 30 },

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
