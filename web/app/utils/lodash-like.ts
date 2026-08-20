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
