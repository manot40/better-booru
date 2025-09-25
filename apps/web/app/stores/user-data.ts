import type { UserData } from '@boorugator/shared/types';

export const useUserData = defineStore(STATIC.keys.userData, {
  state: () => <UserData>{ lastBrowse: {} },

  getters: {
    browseHistory: (state) =>
      Object.entries(state.lastBrowse)
        .sort(([, a], [, b]) => {
          return b[2] - a[2];
        })
        .map(([key, value]) => ({
          key,
          page: value[0],
          tags: value[1]?.split(' ').map((t) => {
            const op = t[0] === '-' ? 'ne' : t[0] === '~' ? 'or' : 'eq';
            return { op: op as 'eq' | 'ne' | 'or', val: op !== 'eq' ? t.slice(1) : t, raw: t };
          }),
          rawTags: value[1],
          lastMod: new Date(value[2]),
        })),
  },

  actions: {
    deleteHistory(key: string) {
      const removed = Object.entries(this.lastBrowse).filter(([k]) => k !== key);
      this.lastBrowse = Object.fromEntries(removed);
    },
  },

  hydrate(state) {
    try {
      const self = useUserData();
      const fromStorage = JSON.parse(localStorage.getItem(STATIC.keys.userData) || '{}');

      Object.assign(state, fromStorage);
      self.$subscribe((_, state) => localStorage.setItem(STATIC.keys.userData, JSON.stringify(state)));
    } catch {}
  },
});
