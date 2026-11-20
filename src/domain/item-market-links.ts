type GetgemsFilter = {
  attributes?: Record<string, readonly string[]>;
  q?: string;
};

const itemFilters: Readonly<Record<string, GetgemsFilter>> = {
  'skin-jetton': { attributes: { skins: ['common'] } },
  'skin-jetton-epic': { attributes: { skins: ['epic'] } },
  'skin-jetton-golden': { attributes: { skins: ['golden'] } },
  'ring-str-1': { attributes: { strength: ['2'], minLvl: ['5'] } },
  'ring-ag-1': { attributes: { agility: ['2'], minLvl: ['5'] } },
  'ring-wit-1': { attributes: { wisdom: ['2'], minLvl: ['5'] } },
  'ring-str-2': { attributes: { strength: ['5'], minLvl: ['10'] } },
  'ring-ag-2': { attributes: { agility: ['5'], minLvl: ['10'] } },
  'ring-wit-2': { attributes: { wisdom: ['5'], minLvl: ['10'] } },
  'ring-str-3': { attributes: { strength: ['10'], minLvl: ['20'] } },
  'ring-ag-3': { attributes: { agility: ['10'], minLvl: ['20'] } },
  'ring-wit-3': { attributes: { wisdom: ['10'], minLvl: ['20'] } },
  montmorillonite: { attributes: { category: ['artifact'] } },
  pear: { attributes: { satiety: ['20'] } },
  'first-aid-kit': { attributes: { health: ['50'] } },
  lighter: { attributes: { charges: ['10'] } },
  'big-black-clock': { attributes: { hunger_shield_days: ['30'] } },
  chiller: { attributes: { toggle: ['71'] } },
  birch: { attributes: { decoration: ['Birch Branch'] } },
  'string-lights': { attributes: { decoration: ['Warm Glow'] } },
  'string-light-color': { attributes: { decoration: ['Colorful Glow'] } },
  'dubai-chocolate': { attributes: { background: ['Dubai'] } },
  'new-york': { attributes: { background: ['New York'] } },
  'scroll-enchant-ring': { attributes: { category: ['consumable'] }, q: 'Ring Enchanter' },
  'scroll-enchant-skin': { attributes: { category: ['consumable'] }, q: 'Skin Enchanter' },
  morpher: { q: 'Morpher' },
  'flask-empty': { q: 'Flask' },
  'flask-half': { q: 'Flask' },
  'flask-full': { q: 'Flask' },
  'floppy-empty': { q: 'Floppy' },
  'floppy-100k': { q: 'Floppy 100k' },
  'floppy-1m': { q: 'Floppy 1M' },
  'floppy-10m': { q: 'Floppy 10M' },
  'floppy-100m': { q: 'Floppy 100M' },
  'floppy-1b': { q: 'Floppy 1B' },
  'voucher-10k': { q: '10k' },
  'voucher-100k': { q: '100k' },
};

export const itemIdToSlug: Readonly<Record<number, string>> = {
  7: 'pear',
  11: 'first-aid-kit',
  12: 'string-light-color',
  13: 'string-lights',
  14: 'birch',
  15: 'dubai-chocolate',
  16: 'new-york',
  25: 'skin-jetton',
  26: 'skin-jetton-epic',
  27: 'skin-jetton-golden',
  28: 'ring-str-1',
  29: 'ring-ag-1',
  30: 'ring-wit-1',
  31: 'ring-str-2',
  32: 'ring-ag-2',
  33: 'ring-wit-2',
  34: 'ring-str-3',
  35: 'ring-ag-3',
  36: 'ring-wit-3',
  39: 'montmorillonite',
  43: 'voucher-10k',
  44: 'voucher-100k',
  45: 'floppy-100k',
  46: 'floppy-1m',
  47: 'floppy-10m',
  48: 'floppy-100m',
  49: 'floppy-1b',
  50: 'lighter',
  52: 'chiller',
  53: 'scroll-enchant-ring',
  54: 'scroll-enchant-skin',
  55: 'morpher',
  72: 'owl-skin',
  73: 'flask-empty',
  74: 'flask-half',
  75: 'flask-full',
  76: 'floppy-empty',
  77: 'big-black-clock',
};

/** Build a Getgems collection URL filtered to the given item type rather than a single NFT. */
export function itemCollectionMarketUrl(collectionAddress: string, slug: string): string {
  const base = 'https://getgems.io/collection/' + collectionAddress;
  const filter = itemFilters[slug];
  if (!filter) return base;
  return `${base}?filter=${encodeURIComponent(JSON.stringify(filter))}`;
}
