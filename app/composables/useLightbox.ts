import PhotoSwipeLightbox, {
  type DataSource,
  type EventCallback,
  type PhotoSwipeOptions,
} from 'photoswipe/lightbox';

type Slide = NonNullable<InstanceType<typeof PhotoSwipeLightbox>['pswp']>['currSlide'];
type LightboxInstance = NonNullable<PhotoSwipeLightbox['pswp']>;

type UseLightboxOptions = {
  onClose?: () => void;
  onDestroy?: () => void;
  onLoadError?: EventCallback<'loadError'>;
  onUiRegister?: (pswp: LightboxInstance) => void;
  onSlideChange?: (slide: Slide, pswp: LightboxInstance) => void;
};

export function useLightbox(
  el: Ref<HTMLElement | null | undefined | DataSource>,
  opts = {} as UseLightboxOptions
) {
  const opened = shallowRef(false);
  const current = shallowRef<Slide>();
  const lightbox = shallowRef<PhotoSwipeLightbox>();

  onUnmounted(destroyLightbox);
  watch(el, createLightbox, { immediate: true });

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

    const debounceOpen = useDebounceFn(() => (opened.value = true), 1);
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
    });

    if (opts.onClose) lb.on('close', opts.onClose);
    if (opts.onLoadError) lb.on('loadError', opts.onLoadError);

    lb.init();
  }

  function destroyLightbox() {
    if (!lightbox.value) return;
    lightbox.value.destroy();
    lightbox.value = undefined;
  }

  return { lightbox, opened, current };
}
