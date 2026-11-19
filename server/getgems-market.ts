import { redis } from './redis';
import collections from '../src/features/market-collections.json';
import stickers from '../src/features/sticker-data.json';

const marketWallet = '0:584ee61b2dff0837116d0fcb5078d93964bcbe9c05fd6a141b1bfca5d6a43e18';
const api = 'https://api.getgems.io/public-api/v1';
const addresses = [...collections, ...stickers.collectionByAlbum.flatMap((address, index) =>
  address ? [{ id: 'album-' + index, address }] : [])];

type CollectionQuote = { id: string; address: string; floor: number | null; supply: number | null; available: boolean };
type ItemsSnapshot = { items: { id: string; floor: number }[]; status: 'ready' | 'unavailable'; updatedAt?: string };

export async function collectionQuotes() {
  const previous = await redis<string | null>(['GET', 'notwise:getgems:collections:v1']).catch(() => null)
    .then(value => value ? JSON.parse(value) as { rows: CollectionQuote[]; at: number } : null);
  if (previous && Date.now() - previous.at < 300_000) return previous.rows;

  const rows = await Promise.all(addresses.map(async ({ id, address }): Promise<CollectionQuote> => {
    try {
      const response = await fetch(`${api}/collection/basic-info/${address}`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw Error();
      const result = (await response.json())?.response;
      if (result?.contract_address !== address) throw Error();
      return {
        id, address,
        floor: Number.isFinite(result.floor) && result.floor > 0 ? result.floor : null,
        supply: Number.isSafeInteger(result.total_supply) && result.total_supply >= 0 ? result.total_supply : null,
        available: true,
      };
    } catch {
      const old = previous?.rows.find(row => row.id === id);
      return { id, address, floor: old?.floor ?? null, supply: old?.supply ?? null, available: false };
    }
  }));
  if (rows.some(row => row.available)) await redis(['SET', 'notwise:getgems:collections:v1', JSON.stringify({ rows, at: Date.now() }), 'EX', 86400]).catch(() => null);
  return rows;
}

function itemSlug(image: unknown) {
  if (typeof image !== 'string') return;
  return /^https:\/\/cdn\.notwise\.co\/nft\/items\/img\/([\w-]+)\.(?:png|webp)(?:\?|$)/i.exec(image)?.[1];
}

function addPrice(prices: Map<string, number>, image: unknown, nano: unknown) {
  const id = itemSlug(image);
  if (!id || typeof nano !== 'string' || !/^\d{1,30}$/.test(nano)) return;
  const floor = Number(nano) / 1e9;
  if (floor > 0 && floor < (prices.get(id) ?? Infinity)) prices.set(id, floor);
}

async function getgemsPage(collection: string, after: string, token: string, prices: Map<string, number>) {
  const query = new URLSearchParams({ limit: '100', ...(after ? { after } : {}) });
  const response = await fetch(`${api}/nfts/on-sale/${collection}?${query}`, {
    headers: { Authorization: token }, signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) throw new Error('Getgems listings unavailable');
  const result = (await response.json())?.response;
  if (!Array.isArray(result?.items)) throw new Error('Unexpected Getgems listings');
  for (const listing of result.items) {
    if (listing.sale?.type === 'FixPriceSale' && listing.sale.currency === 'TON') {
      addPrice(prices, listing.image, listing.sale.fullPrice);
    }
  }
  return result.cursor || '';
}

async function publicListingPage(collection: string, after: string, prices: Map<string, number>) {
  const offset = Number(after);
  const query = new URLSearchParams({ limit: '100', offset: String(offset) });
  const response = await fetch(`https://tonapi.io/v2/nfts/collections/${collection}/items?${query}`, {
    signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) throw new Error('TON indexed listings unavailable');
  const rows = (await response.json()).nft_items;
  if (!Array.isArray(rows)) throw new Error('Unexpected TON indexed listings');
  for (const row of rows) {
    if (row.sale?.market?.address === marketWallet && row.sale.price?.currency_type === 'native' &&
        row.sale.price.decimals === 9) addPrice(prices, row.metadata?.image, row.sale.price.value);
  }
  return rows.length === 100 ? String(offset + 100) : '';
}

export async function itemQuotes(): Promise<ItemsSnapshot> {
  const token = process.env.GETGEMS_READ_TOKEN;
  const key = 'notwise:getgems:items:v2:' + (token ? 'official' : 'public');
  const [cached, cursorCache] = await Promise.all([
    redis<string | null>(['GET', key]).catch(() => null),
    redis<string | null>(['GET', key + ':scan']).catch(() => null),
  ]);
  const stored = cached ? JSON.parse(cached) as ItemsSnapshot : null;
  if (stored?.updatedAt && Date.now() - Date.parse(stored.updatedAt) < 900_000) return stored;
  const stale: ItemsSnapshot = { items: stored?.items ?? [], updatedAt: stored?.updatedAt, status: 'unavailable' };
  const lock = crypto.randomUUID();
  if (!await redis(['SET', key + ':lock', lock, 'NX', 'EX', 35]).catch(() => null)) return stale;

  try {
    const collection = collections.find(item => item.id === 'items')!.address;
    const scan = cursorCache ? JSON.parse(cursorCache) as { cursor: string; prices: [string, number][] } : null;
    let after = scan?.cursor ?? '';
    const prices = new Map<string, number>(scan?.prices);
    const deadline = Date.now() + 4500;
    for (let page = 0; page < 20 && Date.now() < deadline; page++) {
      const next = token ? await getgemsPage(collection, after, token, prices) : await publicListingPage(collection, after, prices);
      if (!next) {
        const result: ItemsSnapshot = { items: [...prices].map(([id, floor]) => ({ id, floor })), status: 'ready', updatedAt: new Date().toISOString() };
        await redis(['SET', key, JSON.stringify(result), 'EX', 86400]);
        await redis(['DEL', key + ':scan']);
        return result;
      }
      if (typeof next !== 'string' || next.length > 256 || next === after) throw new Error('Unexpected market cursor');
      after = next;
      await redis(['SET', key + ':scan', JSON.stringify({ cursor: after, prices: [...prices] }), 'EX', 3600]);
    }
  } catch { /* Keep the last finished snapshot. */ }
  finally {
    await redis(['EVAL', "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end", 1, key + ':lock', lock]).catch(() => null);
  }
  return stale;
}
