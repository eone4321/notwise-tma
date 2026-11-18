import paths from 'virtual:guide-art';

const images = new Map<string, HTMLImageElement>();

export async function warmArt() {
  let next = 0;
  const load = async () => {
    while (next < paths.length) {
      const path = paths[next++];
      const image = new Image();
      image.src = path;
      try {
        await image.decode();
        // Keep frequently revisited assets decoded for the lifetime of the app.
        if (/^\/(brand|game\/(items|skills|capsules))\//.test(path)) images.set(path, image);
      } catch {
        // An isolated asset failure should never block reading the guide.
      }
    }
  };
  let timeout = 0;
  const font = document.fonts.load('34px "Not Wise Frens"', '\ue905').catch(() => []);
  await Promise.race([
    Promise.all([font, ...Array.from({ length: 12 }, load)]),
    new Promise<void>(resolve => { timeout = window.setTimeout(resolve, 4500); }),
  ]);
  window.clearTimeout(timeout);
}
