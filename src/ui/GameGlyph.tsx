const glyphs = {
  chat: 0xe905, share: 0xe90d, settings: 0xe915, lock: 0xe908,
  treasure: 0xe92f, inventory: 0xe932, skin: 0xe933,
  fight: 0xe904, lightning: 0xe907, info: 0xe918,
  shop: 0xe902, gift: 0xe906, shield: 0xe90b, leaf: 0xe941,
  sparkles: 0xe953,
} as const;

const attributes = {
  strength: ['#c1272d', '#870e1d', '#ffffff4d', '#fefeff'],
  agility: ['#39b54a', '#0c7e37', '#ffffff4d', '#ffffff'],
  wisdom: ['#0064df', '#0036a3', '#ffffff4d', '#ffffff'],
  endurance: ['#f7931e', '#f15a24', '#ffffff4d', '#fefefe', '#f15a24'],
} as const;
const offsets = { strength: 0xe927, agility: 0xe92b, wisdom: 0xe937, endurance: 0xe922 };

export type GameGlyphName = keyof typeof glyphs;
export type GameAttributeName = keyof typeof attributes;

export function GameGlyph({ name }: { name: GameGlyphName }) {
  return <span className="gameGlyph" aria-hidden="true">{String.fromCodePoint(glyphs[name])}</span>;
}

export function GameAttribute({ name }: { name: GameAttributeName }) {
  return <span className="gameAttribute" aria-hidden="true">
    {attributes[name].map((color, i) =>
      <span key={i} style={{ color }}>{String.fromCodePoint(offsets[name] + i)}</span>)}
  </span>;
}
