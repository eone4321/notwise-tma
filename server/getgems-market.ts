import { getgemsItemLink } from './owl-sales-feed';
import { redis } from './redis';
import collections from '../src/features/market-collections.json';
import stickers from '../src/features/sticker-data.json';

const marketWallet = '0:584ee61b2dff0837116d0fcb5078d93964bcbe9c05fd6a141b1bfca5d6a43e18';
const api = 'https://api.getgems.io/public-api/v1';
const addresses = [...collections, ...stickers.collectionByAlbum.flatMap((address, index) =>
  address ? [{ id: 'album-' + index, address }] : [])];

type CollectionQuote = { id: string; address: string; floor: number | null; supply: number | null; available: boolean };
type Listing = { floor: number; href: string };
type ItemsSnapshot = { items: ({ id: string; floor: number; href?: string })[]; status: 'ready' | 'unavailable'; updatedAt?: string };

let memoryCollections: { rows: CollectionQuote[]; at: number } | null = null;
let memoryItems: ItemsSnapshot | null = null;

export async function collectionQuotes(): Promise<CollectionQuote[]> {
  const previous = memoryCollections && Date.now() - memoryCollections.at < 300_000
    ? memoryCollections
    : await redis<string | null>(['GET', 'notwise:getgems:collections:v1']).catch(() => null)
        .then(value => value ? JSON.parse(value) as { rows: CollectionQuote[]; at: number } : null);

  if (previous && Date.now() - previous.at < 300_000) return previous.rows;

  const rows: CollectionQuote[] = [];
  const chunkSize = 5;

  for (let i = 0; i < addresses.length; i += chunkSize) {
    const chunk = addresses.slice(i, i + chunkSize);
    const chunkRows = await Promise.all(chunk.map(async ({ id, address }): Promise<CollectionQuote> => {
      try {
        const response = await fetch(`${api}/collection/basic-info/${address}`, {
          signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (!response.ok) throw Error();
        const result = (await response.json())?.response;
        let floor = Number.isFinite(result?.floor) && result.floor > 0 ? Number(result.floor) : null;
        const supply = Number.isSafeInteger(result?.total_supply) && result.total_supply >= 0 ? Number(result.total_supply) : null;

        // If basic-info floor is 0/null, check if tonapi has active on-chain sales
        if (!floor) {
          try {
            const tonRes = await fetch(`https://tonapi.io/v2/nfts/collections/${address}/items?limit=100`, {
              signal: AbortSignal.timeout(4000),
            });
            if (tonRes.ok) {
              const data = await tonRes.json();
              const sales = (data.nft_items || []).filter((it: any) =>
                it.sale && it.sale.price?.currency_type === 'native' && it.sale.price.decimals === 9 && Number(it.sale.price.value) > 0
              );
              if (sales.length > 0) {
                const minFloor = Math.min(...sales.map((s: any) => Number(s.sale.price.value) / 1e9));
                if (minFloor > 0) floor = minFloor;
              }
            }
          } catch { /* Fallback optional */ }
        }

        const old = previous?.rows.find(row => row.id === id);
        return {
          id, address,
          floor: floor ?? old?.floor ?? null,
          supply: supply ?? old?.supply ?? null,
          available: true,
        };
      } catch {
        const old = previous?.rows.find(row => row.id === id);
        return { id, address, floor: old?.floor ?? null, supply: old?.supply ?? null, available: false };
      }
    }));
    rows.push(...chunkRows);
  }

  if (rows.some(row => row.available)) {
    memoryCollections = { rows, at: Date.now() };
    await redis(['SET', 'notwise:getgems:collections:v1', JSON.stringify(memoryCollections), 'EX', 86400]).catch(() => null);
  }

  return rows.length > 0 ? rows : (previous?.rows ?? []);
}

function nameToSlug(name: unknown): string | undefined {
  if (typeof name !== 'string') return;
  const n = name.trim().toLowerCase();
  if (n.startsWith('not wise skin')) return 'owl-skin';
  if (n.includes('golden skin jetton')) return 'skin-jetton-golden';
  if (n.includes('epic skin jetton')) return 'skin-jetton-epic';
  if (n.includes('skin jetton')) return 'skin-jetton';
  if (n.includes('dubai chocolate')) return 'dubai-chocolate';
  if (n.includes('pear')) return 'pear';
  if (n.includes('first aid kit')) return 'first-aid-kit';
  if (n.includes('color string lights')) return 'string-light-color';
  if (n.includes('string lights')) return 'string-lights';
  if (n.includes('birch')) return 'birch';
  if (n.includes('empire state') || n.includes('new york')) return 'new-york';
  if (n.includes('lighter')) return 'lighter';
  if (n.includes('chiller')) return 'chiller';
  if (n.includes('ring enchanter')) return 'scroll-enchant-ring';
  if (n.includes('skin enchanter')) return 'scroll-enchant-skin';
  if (n.includes('morpher')) return 'morpher';
  if (n.includes('clock')) return 'big-black-clock';
  if (n.includes('montmorillonite')) return 'montmorillonite';
  if (n.includes('golden ring of strength') || (n.includes('strength') && n.includes('iii'))) return 'ring-str-3';
  if (n.includes('obsidian ring of strength') || (n.includes('strength') && n.includes('ii'))) return 'ring-str-2';
  if (n.includes('wooden ring of strength') || n.includes('ring of strength')) return 'ring-str-1';
  if (n.includes('golden ring of agility') || (n.includes('agility') && n.includes('iii'))) return 'ring-ag-3';
  if (n.includes('obsidian ring of agility') || (n.includes('agility') && n.includes('ii'))) return 'ring-ag-2';
  if (n.includes('wooden ring of agility') || n.includes('ring of agility')) return 'ring-ag-1';
  if (n.includes('golden ring of wisdom') || (n.includes('wisdom') && n.includes('iii'))) return 'ring-wit-3';
  if (n.includes('obsidian ring of wisdom') || (n.includes('wisdom') && n.includes('ii'))) return 'ring-wit-2';
  if (n.includes('wooden ring of wisdom') || n.includes('ring of wisdom')) return 'ring-wit-1';
  if (n.includes('voucher') && n.includes('100k')) return 'voucher-100k';
  if (n.includes('voucher') && n.includes('10k')) return 'voucher-10k';
  if (n.includes('floppy') && n.includes('100k')) return 'floppy-100k';
  if (n.includes('floppy') && n.includes('1m')) return 'floppy-1m';
  if (n.includes('floppy') && n.includes('10m')) return 'floppy-10m';
  if (n.includes('floppy') && n.includes('100m')) return 'floppy-100m';
  if (n.includes('floppy') && n.includes('1b')) return 'floppy-1b';
  if (n.includes('floppy') && n.includes('empty')) return 'floppy-empty';
  if (n.includes('flask') && n.includes('empty')) return 'flask-empty';
  if (n.includes('flask') && n.includes('half')) return 'flask-half';
  if (n.includes('flask') && n.includes('full')) return 'flask-full';
}

function itemSlug(image: unknown, name?: unknown) {
  if (typeof image === 'string') {
    const match = /^https:\/\/cdn\.notwise\.co\/nft\/items\/img\/([\w-]+)\.(?:png|webp)(?:\?|$)/i.exec(image);
    if (match?.[1]) return match[1];
  }
  return nameToSlug(name);
}

function addPrice(prices: Map<string, Listing>, image: unknown, name: unknown, nano: unknown, nft: unknown, collection: string) {
  const id = itemSlug(image, name);
  if (!id || typeof nano !== 'string' || !/^\d{1,30}$/.test(nano) ||
      typeof nft !== 'string' || !/^(?:[A-Za-z0-9_-]{48}|0:[0-9a-f]{64})$/i.test(nft)) return;
  const floor = Number(nano) / 1e9;
  if (floor > 0 && floor < (prices.get(id)?.floor ?? Infinity)) {
    prices.set(id, { floor, href: getgemsItemLink(nft, collection) });
  }
}

async function fetchCollectionFloorByKind(collectionAddress: string, maxPages: number, prices: Map<string, Listing>) {
  const offsets = Array.from({ length: maxPages }, (_, i) => i * 100);
  const results = await Promise.all(offsets.map(async (offset) => {
    try {
      const res = await fetch(`https://tonapi.io/v2/nfts/collections/${collectionAddress}/items?limit=100&offset=${offset}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.nft_items) ? json.nft_items : [];
    } catch {
      return [];
    }
  }));

  for (const items of results) {
    for (const item of items) {
      if (item.sale && (item.sale.market?.address === marketWallet || item.sale.market?.name?.toLowerCase().includes('getgems')) &&
          item.sale.price?.currency_type === 'native' && item.sale.price.decimals === 9) {
        addPrice(prices, item.metadata?.image, item.metadata?.name, item.sale.price.value, item.address, collectionAddress);
      }
    }
  }
}

export async function itemQuotes(): Promise<ItemsSnapshot> {
  const key = 'notwise:getgems:items:v5';
  if (memoryItems?.updatedAt && Date.now() - Date.parse(memoryItems.updatedAt) < 600_000) {
    return memoryItems;
  }

  const cached = await redis<string | null>(['GET', key]).catch(() => null);
  const stored = cached ? JSON.parse(cached) as ItemsSnapshot : null;
  if (stored?.updatedAt && Date.now() - Date.parse(stored.updatedAt) < 600_000) {
    memoryItems = stored;
    return stored;
  }

  const previous = stored ?? memoryItems;
  const stale: ItemsSnapshot = { items: previous?.items ?? [], updatedAt: previous?.updatedAt, status: 'unavailable' };

  try {
    const itemsCollection = collections.find(item => item.id === 'items')?.address ?? 'EQBfQA3gHs5It6jeb6Wo82q_Djei1w1SWb02Vlne-Kc5MSn6';
    const skinsCollection = collections.find(item => item.id === 'skins')?.address ?? 'EQC_CN9MU1igRcqmuWeUxxyB6_Uvr4JrnyUCaLe609qQNrRA';
    const prices = new Map<string, Listing>();

    // Fetch items collection (approx 12 pages) and skins collection (1 page) concurrently
    await Promise.all([
      fetchCollectionFloorByKind(itemsCollection, 13, prices),
      fetchCollectionFloorByKind(skinsCollection, 2, prices),
    ]);

    if (prices.size > 0) {
      const result: ItemsSnapshot = {
        items: [...prices].map(([id, listing]) => ({ id, ...listing })),
        status: 'ready',
        updatedAt: new Date().toISOString(),
      };
      memoryItems = result;
      await redis(['SET', key, JSON.stringify(result), 'EX', 86400]).catch(() => null);
      return result;
    }
  } catch {
    /* Fallback to stale */
  }

  return stale.items.length > 0 ? { ...stale, status: 'ready' } : stale;
}
