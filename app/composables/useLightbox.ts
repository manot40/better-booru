import PhotoSwipeLightbox from 'photoswipe/lightbox';

export function useLightbox(el: Ref<HTMLElement | null | undefined>) {
  const lightbox = shallowRef<PhotoSwipeLightbox>();
  const rendered = shallowRef(false);

  const userConfig = useUserConfig();

  onMounted(createLightbox);
  onUnmounted(destroyLightbox);
  watch([() => userConfig.provider], createLightbox);

  function createLightbox() {
    if (!el.value) return;
    if (lightbox.value) destroyLightbox();

    const lb = (lightbox.value = new PhotoSwipeLightbox({
      preload: [1, 1],
      gallery: el.value,
      children: '.ps__item',
      pswpModule: () => import('photoswipe'),
      initialZoomLevel: 'fit',
    }));

    if (userConfig.provider === 'safebooru')
      lb.on('loadComplete', function (this: PhotoSwipeLightbox['pswp'], { content }) {
        const el = <HTMLAnchorElement | undefined>content.data.element;
        if (content.state !== 'error' || !el || el.dataset.pswpSrc?.includes('thumbnail')) return;

        const src = content.data.src || '';
        const data = content.data;
        if (!src.includes('org//') && el.dataset.end !== '1') {
          var updated = (data.src = src.replace('org/', 'org//'));
        } else if (!src.includes('?')) {
          var updated = (data.src = src + `?${el.id}`);
        } else if (/org\/\/.*.\?/.test(src)) {
          el.dataset.end = '1';
          var updated = (data.src = src.replace('org//', 'org/'));
        } else {
          const [child] = el.childNodes;
          if (!(child instanceof HTMLImageElement) || el.dataset.pswpSrc === child.src) return;
          var updated = (data.src = child.src);
        }

        el.dataset.pswpSrc = updated;
        this?.refreshSlideContent(content.index);
      });

    lb.on('uiRegister', function (this: PhotoSwipeLightbox['pswp']) {
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
