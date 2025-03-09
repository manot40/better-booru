import PhotoSwipeLightbox, { type DataSource, type PhotoSwipeOptions } from 'photoswipe/lightbox';

type Slide = NonNullable<InstanceType<typeof PhotoSwipeLightbox>['pswp']>['currSlide'];

export function useLightbox(el: Ref<HTMLElement | null | undefined | DataSource>) {
  const current = shallowRef<Slide>();
  const lightbox = shallowRef<PhotoSwipeLightbox>();
  const rendered = shallowRef(false);

  const userConfig = useUserConfig();

  onUnmounted(destroyLightbox);
  watch([el, () => userConfig.provider], createLightbox, { immediate: true });

  function createLightbox() {
    if (!el.value || import.meta.server) return;
    if (lightbox.value) destroyLightbox();

    const options = <PhotoSwipeOptions>{
      preload: [1, 1],
      children: '.ps__item',
      pswpModule: () => import('photoswipe'),
      initialZoomLevel: 'fit',
    };

    if (el.value instanceof Element) options.gallery = el.value;
    else if (Array.isArray(el.value)) options.dataSource = el.value;
    else return;

    const lb = (lightbox.value = new PhotoSwipeLightbox(options));

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
          const el = document.querySelector(`div[data-index="${pswp.currIndex}"] a`);
          if (el instanceof HTMLAnchorElement) window.open(el.href, '_blank', 'noreferrer noopener');
        },
      });
      setTimeout(() => (rendered.value = true), 50);
    });

    lb.on('change', function (this: PhotoSwipeLightbox['pswp']) {
      current.value = this?.currSlide;
    });

    lb.on('close', () => {
      current.value = undefined;
      rendered.value = false;
    });

    lb.init();
  }

  function destroyLightbox() {
    if (!lightbox.value) return;
    lightbox.value.destroy();
    lightbox.value = undefined;
  }

  return { lightbox, rendered, current };
}
