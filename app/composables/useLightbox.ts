import PhotoSwipeLightbox, {
  type DataSource,
  type EventCallback,
  type PhotoSwipeOptions,
} from 'photoswipe/lightbox';

type Slide = NonNullable<InstanceType<typeof PhotoSwipeLightbox>['pswp']>['currSlide'];
type LightboxInstance = NonNullable<PhotoSwipeLightbox['pswp']>;

type UseLightboxOptions = {
  onClose?: () => void;
  onLoadError?: EventCallback<'loadError'>;
  onUiRegister?: (pswp: LightboxInstance) => void;
  onSlideChange?: (slide: Slide, pswp: LightboxInstance) => void;
};

export function useLightbox(
  el: Ref<HTMLElement | null | undefined | DataSource>,
  opts = {} as UseLightboxOptions
) {
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

    lb.on('uiRegister', function (this: PhotoSwipeLightbox['pswp']) {
      if (this) opts.onUiRegister?.(this);
      setTimeout(() => (rendered.value = true), 50);
    });

    lb.on('change', function (this: PhotoSwipeLightbox['pswp']) {
      if (this) opts.onSlideChange?.(this.currSlide, this);
      current.value = this?.currSlide;
    });

    if (opts.onLoadError) lb.on('loadError', opts.onLoadError);

    lb.on('close', () => {
      opts.onClose?.();
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
