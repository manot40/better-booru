import type { UserConfig } from '@boorugator/shared/types';

const maxAge = 180 * 24 * 60 * 60;

export const useUserConfig = defineStore(STATIC.keys.userConfig, {
  state: () =>
    <UserConfig>{
      column: undefined,
      rating: ['g', 's'],
      provider: 'danbooru',
      hideNSFW: true,
      browseMode: 'infinite',
      historyMode: 'url_query',
    },

  getters: {
    nonce: (state) => stringNonce(`${state.provider}-${state.browseMode}-${state.rating}`),
    isInfinite: (state) => state.browseMode === 'infinite',
    asState: (state) => <UserConfig>JSON.parse(
        JSON.stringify({
          column: state.column,
          rating: state.rating,
          provider: state.provider,
          hideNSFW: state.hideNSFW,
          browseMode: state.browseMode,
          historyMode: state.historyMode,
        })
      ),
    providerHost: (state) => (state.provider === 'gelbooru' ? 'gelbooru.com' : 'danbooru.donmai.us'),
  },

  actions: {
    populate() {
      const config = useCookie<UserConfig>(STATIC.keys.userConfig, { readonly: true });
      const local = import.meta.client && localStorage[STATIC.keys.userConfig];

      if (!config.value && !local) {
        return this.mutate(this.$state);
      }

      if (typeof config.value == 'object') Object.assign(this, config.value);
      else if (local) Object.assign(this, JSON.parse(local));
    },

    mutate(value: Partial<UserConfig>) {
      const updated = Object.assign(this.$state, value);

      if (import.meta.server) {
        const cookie = useCookie(STATIC.keys.userConfig, { maxAge });
        cookie.value = JSON.stringify(updated);
      } else {
        localStorage[STATIC.keys.userConfig] = JSON.stringify(updated);
      }
    },

    reset() {
      this.$reset();

      if (import.meta.server) {
        const cookie = useCookie(STATIC.keys.userConfig, { maxAge });
        cookie.value = JSON.stringify(this.$state);
      } else {
        localStorage[STATIC.keys.userConfig] = JSON.stringify(this.$state);
      }
    },

    changeProvider(provider: UserConfig['provider']) {
      this.mutate({ provider, rating: ['g'] });
    },
  },
});

function stringNonce(text: string) {
  if (text.length === 0) return '000000';
  let nonce = 0;
  for (let i = 0; i < text.length; i++) {
    nonce = (nonce << 5) - nonce + text.charCodeAt(i);
    nonce |= 0;
  }
  return nonce.toString(16);
}
