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

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/color-mode', '@pinia/nuxt', '@vueuse/nuxt', 'shadcn-nuxt'],

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
      '/api/**': {
        swr: true,
        cache: { maxAge: 60 * 5, varies: ['x-provider', 'x-rating'] },
      },
      '/api/note/**': { swr: false, cache: false },
    },
  },
});
