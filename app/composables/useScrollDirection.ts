export function useScrollDirection(offset = 0) {
  const top = ref(0);
  const lastPos = refDebounced(top, 100);

  const isBottom = ref(false);
  const scrollUp = ref(false);
  const scrollDown = ref(false);

  const listener = () => {
    const docEl = window.document.documentElement;
    const current = (top.value = window.scrollY || docEl.scrollTop);
    isBottom.value = current > docEl.scrollHeight - 1200;
  };
  const throttledListener = useThrottleFn(() => {
    const current = top.value;
    const up_ = current < lastPos.value;
    const down_ = current > lastPos.value;
    scrollUp.value = up_ === scrollUp.value ? up_ : current < lastPos.value - offset;
    scrollDown.value = down_ === scrollDown.value ? down_ : current > lastPos.value + offset;
  });

  useEventListener('scroll', [listener, throttledListener]);

  return { top, isBottom, scrollUp, scrollDown };
}
