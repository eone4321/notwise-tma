import paths from 'virtual:guide-art';

const images = new Map<string, HTMLImageElement>();

export async function warmArt(onProgress: (loaded: number, total: number) => void) {
  let loaded = 0;
  onProgress(loaded, paths.length);
  let next = 0;
  const load = async () => {
    while (next < paths.length) {
      const path = paths[next++];
      const image = new Image();
      image.src = path;
      try {
        await image.decode();
        images.set(path, image);
      } catch {
        // Continue if an individual asset is unavailable.
      } finally {
        onProgress(++loaded, paths.length);
      }
    }
  };
  let timeout = 0;
  const font = document.fonts.load('34px "Not Wise Frens"', '\ue905').catch(() => []);
  await Promise.race([
    Promise.all([font, ...Array.from({ length: 12 }, load)]),
    new Promise<void>(resolve => { timeout = window.setTimeout(resolve, 12000); }),
  ]);
  window.clearTimeout(timeout);
}
