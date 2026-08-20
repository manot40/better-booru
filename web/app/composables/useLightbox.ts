import type { UnwrapRef } from 'vue';

import PhotoSwipe, { type SlideData } from 'photoswipe';
import PhotoSwipeLightbox, { type EventCallback, type PhotoSwipeOptions } from 'photoswipe/lightbox';

type Slide = PhotoSwipe['currSlide'];

type UseLightboxOptions = {
  onClose?: () => void;
  onDestroy?: () => void;
  onLoadError?: EventCallback<'loadError'>;
  onBeforeInit?: (pswp: PhotoSwipeLightbox) => void;
  onUiRegister?: (pswp: PhotoSwipe) => void;
  onSlideChange?: (slide: Slide, pswp: PhotoSwipe) => void;
  childrenSelector?: string | HTMLElement;
};

type Target = HTMLElement | null | undefined | SlideData[];

export function useLightbox(el: Ref<Target>, opts = {} as UseLightboxOptions) {
  const opened = ref(false);
  const controlVisible = ref(false);

  const current = shallowRef<Slide>();
  const lightbox = shallowRef<PhotoSwipeLightbox>();

  onUnmounted(destroyLightbox);
  watch(el, createLightbox, { immediate: true });

  function createLightbox(el: UnwrapRef<Target>) {
    if (!el || import.meta.server) return;

    if (lightbox.value) {
      if (Array.isArray(el)) {
        lightbox.value.options.dataSource = el;
        return triggerRef(lightbox);
      } else {
        destroyLightbox();
      }
    }

    const options = <PhotoSwipeOptions>{
      preload: [1, 1],
      pswpModule: PhotoSwipe,
      initialZoomLevel: 'fit',
    };

    if (el instanceof Element) {
      options.gallery = el;
      options.children = opts.childrenSelector || '.ps__item';
    }

    const lb = (lightbox.value = new PhotoSwipeLightbox(options));
    const debounceOpen = useDebounceFn(() => (opened.value = controlVisible.value = true), 1);

    lb.on('uiElementCreate', debounceOpen);

    lb.on('uiRegister', function (this: PhotoSwipeLightbox['pswp']) {
      if (this) opts.onUiRegister?.(this);
    });

    lb.on('change', function (this: PhotoSwipeLightbox['pswp']) {
      if (this) opts.onSlideChange?.(this.currSlide, this);
      current.value = this?.currSlide;
    });

    lb.on('destroy', () => {
      opts.onDestroy?.();
      opened.value = false;
      current.value = undefined;
      controlVisible.value = false;
    });

    lb.on('tapAction', () => (controlVisible.value = !controlVisible.value));

    if (opts.onClose) lb.on('close', opts.onClose);
    if (opts.onLoadError) lb.on('loadError', opts.onLoadError);

    const promise: unknown = opts.onBeforeInit?.(lb);
    if (promise instanceof Promise) promise.then(() => lb.init());
    else lb.init();
  }

  function destroyLightbox() {
    if (!lightbox.value) return;
    lightbox.value.destroy();
    lightbox.value = undefined;
  }

  return { lightbox, opened, current, controlVisible };
}
