import type { UserConfig } from '~~/types/common';

const maxAge = 365 * 24 * 60 * 60;

export const useUserConfig = defineStore(STATIC.keys.userConfig, {
  state: () =>
    <UserConfig>{
      column: undefined,
      rating: ['general'],
      provider: 'danbooru',
      hideNSFW: true,
      browseMode: 'paginated',
    },

  getters: {
    nonce: (state) => btoa(`${state.provider}-${state.browseMode}-${state.rating}`),
    isInfinite: (state) => state.browseMode === 'infinite' && state.provider !== 'gelbooru',
  },

  actions: {
    populate() {
      const config = useCookie<UserConfig>(STATIC.keys.userConfig, { maxAge });

      if (!config.value || !Array.isArray(config.value.rating)) {
        config.value = { ...this.$state };
        return;
      }

      if (typeof config.value != 'object') return;
      Object.assign(this, config.value);
    },

    mutate(value: Partial<UserConfig>) {
      const updated = Object.assign(this.$state, value);
      const cookie = useCookie(STATIC.keys.userConfig, { maxAge });
      cookie.value = JSON.stringify(updated);
    },

    reset() {
      this.$reset();
      const cookie = useCookie(STATIC.keys.userConfig, { maxAge });
      cookie.value = JSON.stringify(this.$state);
    },

    changeProvider(provider: UserConfig['provider']) {
      this.mutate({ provider, rating: ['general'] });
    },
  },
});
