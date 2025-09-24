import type { ListParams, UserData } from '@boorugator/shared/types';
import type { WatchCallback } from 'vue';

import { hash } from 'ohash';
import { destr } from 'destr';

type BrowseHistory = UserData['lastBrowse'][string];

export const useBrowseHistory = () => {
  const userData = useUserData();
  const userConfig = useUserConfig();

  const lastSession = useState<BrowseHistory | null>('last-browse-session', () => null);

  const watcher = useDebounceFn<WatchCallback<ListParams, ListParams | undefined>>(({ page, tags }) => {
    if (!userConfig.isInfinite || import.meta.server) return;

    const key = getKeyFromTags(tags);
    const data = [page, tags, Date.now()] as BrowseHistory;
    const session = destr<BrowseHistory | null>(sessionStorage[key]);
    const fromLocal = userData.lastBrowse[key];

    if (fromLocal) {
      const isSameNavigation = fromLocal[0] === data[0] && fromLocal[1] === data[1];

      if (isSameNavigation) return;
      if (!session || (session[0] !== data[0] && session[1] !== data[1])) {
        lastSession.value = fromLocal;
      }
    }

    if (page.toString() !== '1') {
      lastSession.value = null;
      userData.lastBrowse[key] = data;
      sessionStorage[key] = JSON.stringify(data);
    }
  }, 50);

  return { lastSession, watcher };
};

function getKeyFromTags(tags?: string) {
  const tagsArr = tags
    ?.split(' ')
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return tagsArr ? hash(tagsArr) : 'default';
}
