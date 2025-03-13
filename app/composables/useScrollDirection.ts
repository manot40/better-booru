export function useScrollDirection(offset = 0) {
  const top = ref(0);
  const lastPos = refDebounced(top, 100);

  const isBottom = ref(false);
  const scrollUp = ref(false);
  const scrollDown = ref(false);

  useEventListener(
    'scroll',
    useThrottleFn(() => {
      const current = window.scrollY || document.documentElement.scrollTop;
      top.value = current;
      isBottom.value = current > window.document.documentElement.scrollHeight - 1200;

      const up_ = current < lastPos.value;
      const down_ = current > lastPos.value;
      scrollUp.value = up_ === scrollUp.value ? up_ : current < lastPos.value - offset;
      scrollDown.value = down_ === scrollDown.value ? down_ : current > lastPos.value + offset;
    })
  );

  return { top, isBottom, scrollUp, scrollDown };
}
