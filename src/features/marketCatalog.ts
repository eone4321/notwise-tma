import marketCollections from './market-collections';
import { itemCollectionMarketUrl } from '../domain/item-market-links';

export type MarketCategory = 'rings' | 'skins' | 'items' | 'collections';
export type RingStat = 'str' | 'ag' | 'wit';
export type RingTier = 1 | 2 | 3;

export type MarketAsset = {
  slug: string;
  historySlug: string;
  category: MarketCategory;
  nameRu: string;
  nameEn: string;
  icon: string;
  enchantable?: boolean;
  ringStat?: RingStat;
  ringTier?: RingTier;
  collectionAddress: string;
  collectionUrl: string;
  noteRu?: string;
};

const itemsColAddress = marketCollections.find(c => c.id === 'items')!.address;
const skinsColAddress = marketCollections.find(c => c.id === 'skins')!.address;

const ringAssets: MarketAsset[] = [
  // Strength
  { slug: 'ring-str-1', historySlug: 'ring-str-1', category: 'rings', nameRu: 'Деревянное кольцо силы', nameEn: 'Wooden Ring of Strength', icon: '/game/items/ring-str-1.webp', enchantable: true, ringStat: 'str', ringTier: 1, collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'ring-str-1') },
  { slug: 'ring-str-2', historySlug: 'ring-str-2', category: 'rings', nameRu: 'Обсидиановое кольцо силы', nameEn: 'Obsidian Ring of Strength', icon: '/game/items/ring-str-2.webp', enchantable: true, ringStat: 'str', ringTier: 2, collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'ring-str-2') },
  { slug: 'ring-str-3', historySlug: 'ring-str-3', category: 'rings', nameRu: 'Золотое кольцо силы', nameEn: 'Golden Ring of Strength', icon: '/game/items/ring-str-3.webp', enchantable: true, ringStat: 'str', ringTier: 3, collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'ring-str-3') },
  // Agility
  { slug: 'ring-ag-1', historySlug: 'ring-ag-1', category: 'rings', nameRu: 'Деревянное кольцо ловкости', nameEn: 'Wooden Ring of Agility', icon: '/game/items/ring-ag-1.webp', enchantable: true, ringStat: 'ag', ringTier: 1, collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'ring-ag-1') },
  { slug: 'ring-ag-2', historySlug: 'ring-ag-2', category: 'rings', nameRu: 'Обсидиановое кольцо ловкости', nameEn: 'Obsidian Ring of Agility', icon: '/game/items/ring-ag-2.webp', enchantable: true, ringStat: 'ag', ringTier: 2, collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'ring-ag-2') },
  { slug: 'ring-ag-3', historySlug: 'ring-ag-3', category: 'rings', nameRu: 'Золотое кольцо ловкости', nameEn: 'Golden Ring of Agility', icon: '/game/items/ring-ag-3.webp', enchantable: true, ringStat: 'ag', ringTier: 3, collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'ring-ag-3') },
  // Wisdom
  { slug: 'ring-wit-1', historySlug: 'ring-wit-1', category: 'rings', nameRu: 'Деревянное кольцо мудрости', nameEn: 'Wooden Ring of Wisdom', icon: '/game/items/ring-wit-1.webp', enchantable: true, ringStat: 'wit', ringTier: 1, collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'ring-wit-1') },
  { slug: 'ring-wit-2', historySlug: 'ring-wit-2', category: 'rings', nameRu: 'Обсидиановое кольцо мудрости', nameEn: 'Obsidian Ring of Wisdom', icon: '/game/items/ring-wit-2.webp', enchantable: true, ringStat: 'wit', ringTier: 2, collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'ring-wit-2') },
  { slug: 'ring-wit-3', historySlug: 'ring-wit-3', category: 'rings', nameRu: 'Золотое кольцо мудрости', nameEn: 'Golden Ring of Wisdom', icon: '/game/items/ring-wit-3.webp', enchantable: true, ringStat: 'wit', ringTier: 3, collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'ring-wit-3') },
];

const skinAssets: MarketAsset[] = [
  {
    slug: 'owl-skin',
    historySlug: 'owl-skin',
    category: 'skins',
    nameRu: 'NFT-скины сов',
    nameEn: 'NOT Wise Skin',
    icon: '/brand/collections/skins.png',
    enchantable: true,
    collectionAddress: skinsColAddress,
    collectionUrl: `https://getgems.io/collection/${skinsColAddress}`,
    noteRu: 'Скины из коллекции NOT Wise: Skins на Getgems.',
  },
  { slug: 'skin-jetton', historySlug: 'skin-jetton', category: 'skins', nameRu: 'Скин-жетон (обычный)', nameEn: 'Skin Jetton', icon: '/game/items/skin-jetton.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'skin-jetton') },
  { slug: 'skin-jetton-epic', historySlug: 'skin-jetton-epic', category: 'skins', nameRu: 'Эпический скин-жетон', nameEn: 'Epic Skin Jetton', icon: '/game/items/skin-jetton-epic.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'skin-jetton-epic') },
  { slug: 'skin-jetton-golden', historySlug: 'skin-jetton-golden', category: 'skins', nameRu: 'Золотой жетон скина', nameEn: 'Golden Skin Jetton', icon: '/game/items/skin-jetton-golden.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'skin-jetton-golden') },
  { slug: 'scroll-enchant-skin', historySlug: 'scroll-enchant-skin', category: 'skins', nameRu: 'Заточка скина', nameEn: 'Skin Enchanter', icon: '/game/items/scroll-enchant-skin.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'scroll-enchant-skin') },
];

const itemAssets: MarketAsset[] = [
  { slug: 'scroll-enchant-ring', historySlug: 'scroll-enchant-ring', category: 'items', nameRu: 'Заточка кольца', nameEn: 'Ring Enchanter', icon: '/game/items/scroll-enchant-ring.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'scroll-enchant-ring') },
  { slug: 'montmorillonite', historySlug: 'montmorillonite', category: 'items', nameRu: 'Монтмориллонит', nameEn: 'Montmorillonite', icon: '/game/items/montmorillonite.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'montmorillonite') },
  { slug: 'big-black-clock', historySlug: 'big-black-clock', category: 'items', nameRu: 'Большие чёрные часы', nameEn: 'Big Black Clock', icon: '/game/items/big-black-clock.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'big-black-clock') },
  { slug: 'chiller', historySlug: 'chiller', category: 'items', nameRu: 'Холодильник XP', nameEn: 'Chiller', icon: '/game/items/chiller.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'chiller') },
  { slug: 'lighter', historySlug: 'lighter', category: 'items', nameRu: 'Зажигалка', nameEn: 'Lighter', icon: '/game/items/lighter.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'lighter') },
  { slug: 'morpher', historySlug: 'morpher', category: 'items', nameRu: 'Морфер', nameEn: 'Morpher', icon: '/game/items/morpher.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'morpher') },
  { slug: 'dubai-chocolate', historySlug: 'dubai-chocolate', category: 'items', nameRu: 'Дубайский шоколад', nameEn: 'Dubai Chocolate', icon: '/game/items/dubai-chocolate.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'dubai-chocolate') },
  { slug: 'new-york', historySlug: 'new-york', category: 'items', nameRu: 'Ветка Эмпайр-стейт', nameEn: 'New York', icon: '/game/items/new-york.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'new-york') },
  { slug: 'birch', historySlug: 'birch', category: 'items', nameRu: 'Берёзовая ветка', nameEn: 'Birch', icon: '/game/items/birch.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'birch') },
  { slug: 'string-lights', historySlug: 'string-lights', category: 'items', nameRu: 'Гирлянда', nameEn: 'String Lights', icon: '/game/items/string-lights.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'string-lights') },
  { slug: 'string-light-color', historySlug: 'string-light-color', category: 'items', nameRu: 'Цветная гирлянда', nameEn: 'Color String Lights', icon: '/game/items/string-light-color.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'string-light-color') },
  { slug: 'pear', historySlug: 'pear', category: 'items', nameRu: 'Сочная груша', nameEn: 'Pear', icon: '/game/items/pear.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'pear') },
  { slug: 'first-aid-kit', historySlug: 'first-aid-kit', category: 'items', nameRu: 'Аптечка', nameEn: 'First Aid Kit', icon: '/game/items/first-aid-kit.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'first-aid-kit') },
  { slug: 'voucher-10k', historySlug: 'voucher-10k', category: 'items', nameRu: 'Ваучер 10k', nameEn: 'Voucher 10k', icon: '/game/items/voucher-10k.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'voucher-10k') },
  { slug: 'voucher-100k', historySlug: 'voucher-100k', category: 'items', nameRu: 'Ваучер 100k', nameEn: 'Voucher 100k', icon: '/game/items/voucher-100k.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'voucher-100k') },
  { slug: 'floppy-1m', historySlug: 'floppy-1m', category: 'items', nameRu: 'Дискета 1M', nameEn: 'Floppy 1M', icon: '/game/items/floppy-1m.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'floppy-1m') },
  { slug: 'floppy-10m', historySlug: 'floppy-10m', category: 'items', nameRu: 'Дискета 10M', nameEn: 'Floppy 10M', icon: '/game/items/floppy-10m.webp', collectionAddress: itemsColAddress, collectionUrl: itemCollectionMarketUrl(itemsColAddress, 'floppy-10m') },
];

const collectionAssets: MarketAsset[] = marketCollections
  .filter(col => col.id !== 'items')
  .map(col => ({
    slug: `col:${col.id}`,
    historySlug: `col:${col.id}`,
    category: 'collections',
    nameRu: col.name,
    nameEn: col.name,
    icon: `/brand/collections/${col.id}.png`,
    collectionAddress: col.address,
    collectionUrl: `https://getgems.io/collection/${col.address}`,
  }));

export const marketCatalog: readonly MarketAsset[] = [
  ...ringAssets,
  ...skinAssets,
  ...itemAssets,
  ...collectionAssets,
];

export const marketAssetBySlug = new Map(marketCatalog.map(asset => [asset.slug, asset]));

export const ringStatLabels: Record<RingStat, string> = {
  str: 'Сила',
  ag: 'Ловкость',
  wit: 'Мудрость',
};

export const ringTierLabels: Record<RingTier, string> = {
  1: 'Деревянное',
  2: 'Обсидиановое',
  3: 'Золотое',
};

/** Ring stat bonus at a given tier (1..3) and enchant level (0..20). */
export function ringStatBonus(tier: RingTier, enchant: number): number {
  const base = [2, 5, 10][tier - 1];
  return base + enchant;
}

/**
 * Expected number of base rings & scrolls needed to self-enchant to `target`,
 * using the game's enchant success curve (safe up to +3, burn risk from +4: 80%, 70%, 60%, 50%, 40%, 30%, 20%...).
 */
export function expectedRingEnchantCost(target: number, baseRingFloor: number, scrollFloor: number): {
  expectedGram: number;
  expectedScrolls: number;
  expectedRings: number;
  survivalChance: number;
} | null {
  if (target <= 0 || !(baseRingFloor > 0) || !(scrollFloor > 0)) return null;
  let rings = 1;
  let scrolls = 0;
  let survival = 1;
  for (let lvl = 1; lvl <= target; lvl++) {
    // Safe +1..+3 (100%), then +4 is 80%, decreasing by 10% down to 10% floor.
    const p = lvl <= 3 ? 1 : Math.max(0.1, 1.1 - lvl * 0.1);
    rings = rings / p;
    scrolls = (scrolls + 1) / p;
    survival *= p;
  }
  return {
    expectedGram: Math.round(rings * baseRingFloor + scrolls * scrollFloor),
    expectedScrolls: Math.round(scrolls * 10) / 10,
    expectedRings: Math.round(rings * 10) / 10,
    survivalChance: survival * 100,
  };
}
