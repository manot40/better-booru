import type { UserData } from '@boorugator/shared/types';

export const useUserData = defineStore(STATIC.keys.userData, {
  state: () => <UserData>{ lastBrowse: {} },

  getters: {},

  actions: {},

  hydrate(state) {
    try {
      const self = useUserData();
      const fromStorage = JSON.parse(localStorage.getItem(STATIC.keys.userData) || '{}');

      Object.assign(state, fromStorage);
      self.$subscribe((_, state) => localStorage.setItem(STATIC.keys.userData, JSON.stringify(state)));
    } catch {}
  },
});
