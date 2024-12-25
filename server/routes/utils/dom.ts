import { Window } from 'happy-dom';

const method = 'HEAD' as const;

export async function getImageURL(input: string) {
  const window = new Window({
    innerWidth: 1280,
    innerHeight: 768,
  });
  const document = window.document;
  document.write(input);

  const imgList = document.querySelectorAll('img.preview' as 'img');
  const URLs = await Promise.all(
    imgList.map(async (el) => {
      let url = el.src.split('?').at(0) || el.src;
      const first = await fetch((url = el.src.replace(/thumbnail/g, 'sample')), { method });
      if (first.ok) return url;
      const second = await fetch((url = el.src.replace(/samples/g, 'images').replace(/sample_/, '')), {
        method,
      });
      if (second.ok) return url;
      const third = await fetch((url = el.src.replace(/jp(e?)g/, 'png')), { method });
      if (third.ok) return url;
      return el.src;
    })
  );

  window.close();
  return URLs;
}
