export const throttleDebounce = <T extends any[], R = any>(fn: (...args: T) => R, delay: number) => {
  let isThrottled = false;
  return <typeof fn>((...args) => {
    if (isThrottled) return;
    fn(...args);
    isThrottled = true;
    setTimeout(() => (isThrottled = false), delay);
  });
};
