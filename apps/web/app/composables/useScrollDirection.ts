type RefElement = MaybeRefOrGetter<string | HTMLElement | null | undefined>;

export function useScrollDirection(offset = 0, target?: RefElement) {
  const element = computed(() => {
    if (import.meta.server) return;
    const el = isRef(target) ? target.value : typeof target == 'function' ? target() : target;
    return (
      <HTMLElement>(typeof el == 'string' ? document.querySelector(el) : el) ||
      window.document.documentElement
    );
  });

  const top = ref(0);
  const lastPos = refDebounced(top, 100);

  const isBottom = ref(false);
  const scrollUp = ref(false);
  const scrollDown = ref(false);

  const listener = () => {
    const docEl = element.value;
    if (!docEl) return;
    const current = (top.value = docEl.scrollTop || window.scrollY);
    isBottom.value = current > docEl.scrollHeight - 1200;
  };
  const throttledListener = useThrottleFn(() => {
    const current = top.value;
    const up_ = current < lastPos.value;
    const down_ = current > lastPos.value;
    scrollUp.value = up_ === scrollUp.value ? up_ : current < lastPos.value - offset;
    scrollDown.value = down_ === scrollDown.value ? down_ : current > lastPos.value + offset;
  });

  useEventListener(element, 'scroll', [listener, throttledListener]);

  return { top, isBottom, scrollUp, scrollDown };
}
