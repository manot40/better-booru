import type { UserConfig } from 'booru-shared/types';

export const useUserData = defineStore(STATIC.keys.userData, {
  state: () => <UserConfig>{},

  getters: {},

  actions: {},
});
