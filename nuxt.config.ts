// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2024-12-25',

  typescript: {
    typeCheck: 'build',
  },

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/color-mode', 'shadcn-nuxt', '@vueuse/nuxt'],

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
});
