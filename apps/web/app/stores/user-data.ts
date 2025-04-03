import type { UserConfig } from '~~/types/common';

export const useUserData = defineStore(STATIC.keys.userData, {
  state: () => <UserConfig>{},

  getters: {},

  actions: {},
});
