import { artSrc } from './warmArt';

const symbols = { rocket: 8, swords: 16, shield: 17, target: 18, trophy: 19, bolt: 21, xp: 24,
  muscle: 25, heart: 27, boxing: 29, fire: 31, magnifier: 10 } as const;

export function GameSymbol({ name, size = 36 }: { name: keyof typeof symbols; size?: number }) {
  return <span className="gameSymbol" aria-hidden="true" style={{
    width: size, height: size,
    backgroundImage: `url("${artSrc('/game/ui/settings-emoji.webp')}")`,
    backgroundPosition: (symbols[name] * 100 / 47) + '% 0',
  }}/>;
}
