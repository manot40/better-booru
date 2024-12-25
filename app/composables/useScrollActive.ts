export function useScrollActive(offset = 0) {
  const top = ref(0);
  const lastPos = ref(0);
  const scrollUp = ref(false);
  const scrollDown = ref(false);

  useEventListener('scroll', function () {
    const pos = window.scrollY + offset;
    top.value = pos;
    lastPos.value = pos;
    scrollUp.value = pos > lastPos.value;
    scrollDown.value = pos < lastPos.value;
  });

  return { top, scrollUp, scrollDown };
}
