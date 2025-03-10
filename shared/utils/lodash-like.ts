export const throttleDebounce = <T extends any[], R = any>(fn: (...args: T) => R, delay: number) => {
  let isThrottled = false;
  return <typeof fn>((...args) => {
    if (isThrottled) return;
    fn(...args);
    isThrottled = true;
    setTimeout(() => (isThrottled = false), delay);
  });
};

export const startCase = (str: string) =>
  str
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\s[a-z]/g, (char) => char.toUpperCase());

export const preciseCompare = (a: number, b: number, precision = 1) => Math.abs(a - b) <= precision;

export const pluralify = (word: string, count: number, withCount = true) =>
  `${withCount && count ? count : ''} ${word}${count === 1 ? '' : 's'}`.trim();

export function deepCompare<T extends Array<any> | Record<any, any>>(a: T, b: T) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepCompare(a[i], b[i])) return false;
    return true;
  } else {
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const key in a) {
      // @ts-ignore
      if (!deepCompare(a[key], b[key])) return false;
    }
    return true;
  }
  return a === b;
}
