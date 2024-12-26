import PhotoSwipeLightbox from 'photoswipe/lightbox';

export function useLightbox(el: Ref<HTMLElement | null | undefined>) {
  const lightbox = shallowRef<PhotoSwipeLightbox>();
  const rendered = shallowRef(false);

  onMounted(createLightbox);
  onUnmounted(destroyLightbox);

  function createLightbox() {
    if (!el.value) return;
    const lb = (lightbox.value = new PhotoSwipeLightbox({
      initialZoomLevel: 'fit',
      gallery: el.value,
      children: '.ps__item',
      pswpModule: () => import('photoswipe'),
    }));

    lb.on('loadComplete', ({ content }) => {
      const el = content.data.element;

      if (content.state !== 'error' || !el) return;
      if (content.data.src?.includes('org//image')) {
        const [child] = el.childNodes;
        if (!(child instanceof HTMLImageElement)) return;
        var updated = (content.data.src = child.src);
      } else {
        var updated = (content.data.src = content.data.src?.replace('org/image', 'org//image') || '');
      }

      el.dataset.pswpSrc = updated;
      content.load(false, true);
    });

    lb.on('uiRegister', function (this: PhotoSwipeLightbox['pswp']) {
      this?.ui?.registerElement({
        name: 'reload-btn',
        order: 9,
        isButton: true,
        className: 'pswp__reload text-white',
        onClick: (_1, _2, pswp) => pswp.currSlide?.load(),
      });
      this?.ui?.registerElement({
        name: 'open-btn',
        order: 9,
        isButton: true,
        className: 'pswp__open text-white',
        onClick(_1, _2, pswp) {
          const el = pswp.currSlide?.content.data.element;
          if (el instanceof HTMLAnchorElement) el.click();
        },
      });
      setTimeout(() => (rendered.value = true), 50);
    });

    lb.on('close', () => (rendered.value = false));

    lb.init();
  }

  function destroyLightbox() {
    if (!lightbox.value) return;
    lightbox.value.destroy();
    lightbox.value = undefined;
  }

  return { lightbox, rendered };
}
