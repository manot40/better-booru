import type { AsyncDataRequestStatus } from '#app';

export const randomInt = (from: number, to: number) => Math.floor(Math.random() * (to - from + 1) + from);

export const isPend = (status: AsyncDataRequestStatus) => status === 'pending';

export const unwrapRef = <T = any>(v: MaybeRef<T>) => (isRef(v) ? v.value : v);

export const createBooruURL = (id: number) => {
  const config = useUserConfig();
  if (config.provider === 'danbooru') return `https://danbooru.donmai.us/posts/${id}`;
  const hostname = config.provider === 'safebooru' ? 'safebooru.org' : 'gelbooru.com';
  return `https://${hostname}/index.php?page=post&s=view&id=${id}`;
};
