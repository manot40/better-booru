async function main() {
  const TARGET = ".content > div:first-of-type img.preview";
  const elements = document.querySelectorAll(TARGET);

  if (!elements.length) return;
  else loadPhotoswipe();

  for (const el of elements) {
    el.dataset.oriUrl = el.src;
    el.onerror = handleError;
    el.onload = handleLoad;
    el.src = el.src.replace(/thumbnail/g, "sample");
  }

  document.body.style.display = "initial";
}

function handleLoad() {
  if (this.dataset.loaded) return;

  const url = this.src,
    ico = document.createElement("i"),
    div = document.createElement("div"),
    btn = document.createElement("button"),
    parent = this.parentElement,
    grandParent = parent.parentElement;

  div.className = "dl";
  ico.className = "ti ti-download";

  parent.target = "_blank";
  parent.dataset.cropped = true;
  parent.dataset.pswpSrc = url;
  parent.dataset.pswpWidth = this.naturalWidth;
  parent.dataset.pswpHeight = this.naturalHeight;

  btn.onclick = handleDownload;
  btn.dataset.url = url.includes("/images") ? url : toImages(url);

  btn.appendChild(ico);
  div.appendChild(btn);
  grandParent.appendChild(div);

  delete this.dataset.retry;
  this.dataset.loaded = true;
}

function handleError() {
  const retry = parseInt(this.dataset.retry || "0");

  if (retry >= 5) this.src = this.dataset.oriUrl;
  else if (this.src.includes("org/sample")) this.src = this.src.replace("/sample", "//sample");
  else if (this.src.includes("//sample")) this.src = toImages(this.src);
  else if (this.src.includes("//images")) this.src = this.src.replace("//images", "/images");
  else if (this.src.includes("/images")) this.src = this.src.replace(/jp(e?)g/, "png");

  this.dataset.retry = retry + 1;
}

async function handleDownload() {
  const url = this.dataset.url,
    fileName = url
      .split("/")
      .pop()
      .replace(/\?(.*)/, "");

  if (this.dataset.obj) return triggerDl(this.dataset.obj, fileName);
  toggleDisable(this, true);

  let res = await fetch(url);
  if (!res.ok) {
    res = await fetch(url.replace(/jp(e?)g/, "png"));
    if (!res.ok) {
      res = await fetch();
      if (!res.ok) return toggleDisable(this, false), alert(res.statusText);
    }
  }
  const objUrl = URL.createObjectURL(await res.blob());

  this.dataset.obj = objUrl;
  toggleDisable(this, false);
  triggerDl(objUrl, fileName);
}

const toImages = (src) => src.replace(/samples/g, "images").replace(/sample_/, "");
const triggerDl = (objUrl, filename) => {
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  a.click();
};
const toggleDisable = (el, state) => {
  const [ico] = el.childNodes;
  ico.className = state ? "ti ti-loader-2" : "ti ti-download";
  el.disabled = state;
};
const loadPhotoswipe = async () => {
  const VER = "5.4",
    HOST = "https://cdn.jsdelivr.net/npm/photoswipe";

  const { default: PhotoSwipe } = await import(`${HOST}@${VER}/lightbox/+esm`);
  const lightbox = new PhotoSwipe({
    gallery: "#post-list .content > div:first-of-type",
    children: "a[data-pswp-src]",
    pswpModule: () => import(`${HOST}@${VER}/+esm`),
    wheelToZoom: true,
  });

  lightbox.addFilter("itemData", (itemData) => {
    if (itemData instanceof HTMLElement)
      return {
        src: itemData.dataset.pswpSrc,
        width: itemData.dataset.pswpWidth,
        height: itemData.dataset.pswpHeight,
        element: itemData,
        thumbCropped: itemData.dataset.cropped,
      };
    else return itemData;
  });

  (window.ps = lightbox).init();
};

main();
