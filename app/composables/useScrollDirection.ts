export function useScrollDirection(offset = 0) {
  const top = ref(0);
  const lastPos = refDebounced(top, 100);

  const up = ref(false);
  const down = ref(false);
  const isBot = ref(false);

  useEventListener('scroll', function () {
    const current = window.scrollY || document.documentElement.scrollTop;
    top.value = current;
    isBot.value = current > this.document.documentElement.scrollHeight - 1200;

    const up_ = current < lastPos.value;
    const down_ = current > lastPos.value;
    up.value = up_ === up.value ? up_ : current < lastPos.value - offset;
    down.value = down_ === down.value ? down_ : current > lastPos.value + offset;
  });

  const isBottom = refThrottled(isBot, 100);
  const scrollUp = refThrottled(up, 250);
  const scrollDown = refThrottled(down, 250);

  return { top, isBottom, scrollUp, scrollDown };
}
