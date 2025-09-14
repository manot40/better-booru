export default defineNuxtRouteMiddleware(() => {
  const nuxt = useNuxtApp();
  const config = useUserConfig();
  if (nuxt.isHydrating) config.populate();
});
