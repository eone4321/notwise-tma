import paths from 'virtual:guide-art';

const images = new Map<string, HTMLImageElement>();
export const artSrc = (path: string) => images.get(path)?.src ?? path;

export async function warmArt(onProgress: (loaded: number, total: number) => void) {
  let loaded = 0;
  onProgress(loaded, paths.length);
  let next = 0;
  const load = async () => {
    while (next < paths.length) {
      const path = paths[next++];
      const image = new Image();
      let objectUrl: string | undefined;
      try {
        const response = await fetch(path, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('Image unavailable');
        objectUrl = URL.createObjectURL(await response.blob());
        image.src = objectUrl;
        await image.decode();
        images.set(path, image);
      } catch {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        // Continue if an individual asset is unavailable.
      } finally {
        onProgress(++loaded, paths.length);
      }
    }
  };
  const font = document.fonts.load('20px "Not Wise Icons"', '\ue905\ue922\ue937').catch(() => []);
  await Promise.all([font, ...Array.from({ length: 12 }, load)]);
}
