export default defineNuxtRouteMiddleware(() => {
  const nuxt = useNuxtApp();
  const ucfg = useUserConfig();
  if (nuxt.isHydrating) ucfg.populate();
});
