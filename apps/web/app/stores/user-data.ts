import type { UserConfig } from '@boorugator/shared/types';

export const useUserData = defineStore(STATIC.keys.userData, {
  state: () => <UserConfig>{},

  getters: {},

  actions: {},
});
