export function useScrollDirection(offset = 0) {
  const top = ref(0);
  const lastPos = refDebounced(top, 100);

  const up = ref(false);
  const down = ref(false);
  const isBot = ref(false);

  useEventListener('scroll', function () {
    const current = window.scrollY || document.documentElement.scrollTop;
    top.value = current;
    up.value = current < lastPos.value - offset;
    down.value = current > lastPos.value + offset;
    isBot.value = current > this.document.documentElement.scrollHeight - 1200;
  });

  const isBottom = refThrottled(isBot, 100);
  const scrollUp = refThrottled(up, 100);
  const scrollDown = refThrottled(down, 100);

  return { top, isBottom, scrollUp, scrollDown };
}
