import type { Provider } from '~~/types/common';

export const processRating = (provider: Provider, rating: string | undefined, tags = '') => {
  if (!rating) return tags;
  const tagAppend = tags ? tags + ' ' : '';

  if (provider === 'danbooru') {
    const processed = 'rating:' + rating.replaceAll(' ', ',');
    return `${tagAppend}${processed}`;
  } else {
    const splitted = rating.split(' ');
    const processed = splitted.reduce((acc, next, i) => {
      const plus = i === 0 ? '' : ' ';
      if (!next) return acc;
      if (!next.startsWith('-')) return acc + `${plus}rating:${next}`;
      return acc + `${plus}-rating:${next.slice(1)}`;
    }, '');

    return processed ? `${tagAppend}${processed}` : tags;
  }
};
