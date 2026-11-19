import { artSrc } from './warmArt';

export function AlbumLogo({ id, size }: { id: number; size?: number }) {
  const index = id - 1;
  return <span className="albumLogo" aria-hidden="true" style={{
    width: size,
    backgroundImage: `url("${artSrc('/game/ui/album-logos.webp')}")`,
    backgroundPosition: `${index % 5 * 25}% ${Math.floor(index / 5) * 100 / 3}%`,
  }}/>;
}
