import { getgemsItemLink } from './owl-sales-feed.js';
import { redis } from './redis.js';
import collections from '../src/features/market-collections.js';
import stickers from '../src/features/sticker-data.js';

const marketWallet = '0:584ee61b2dff0837116d0fcb5078d93964bcbe9c05fd6a141b1bfca5d6a43e18';
const api = 'https://api.getgems.io/public-api/v1';
const addresses = [...collections, ...stickers.collectionByAlbum.flatMap((address, index) =>
  address ? [{ id: 'album-' + index, address }] : [])];
const itemsCollection = collections.find(row => row.id === 'items')!.address;
const snapshotKey = 'notwise:getgems:market:v1';
const lockKey = snapshotKey + ':lock';
const interval = 15 * 60_000;

type CollectionQuote = {
  id: string; address: string; floor: number | null; supply: number | null; updatedAt: string | null; available: boolean;
};
type Listing = { id: string; floor: number; href: string };
type ItemSource = 'getgems' | 'toncenter' | 'getgems-on-chain';
type ItemsSnapshot = { items: Listing[]; status: 'ready' | 'stale' | 'unavailable'; updatedAt?: string; source?: ItemSource };
type MarketSnapshot = { collections: CollectionQuote[]; items: ItemsSnapshot; attemptedAt: number };
type TonItem = { address?: string; metadata?: { image?: string; name?: string };
  sale?: { market?: { address?: string }; price?: { currency_type?: string; decimals?: number; value?: string } } };

let memory: MarketSnapshot | null = null;
let refreshInFlight: Promise<MarketSnapshot | null> | null = null;

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
  const ring = /\bring of (strength|agility|wisdom)\b/.exec(n);
  if (ring) {
    const stat = { strength: 'str', agility: 'ag', wisdom: 'wit' }[ring[1]];
    const tier = /\b(golden|iii)\b/.test(n) ? 3 : /\b(obsidian|ii)\b/.test(n) ? 2 : /\b(wooden|i)\b/.test(n) ? 1 : null;
    return tier ? `ring-${stat}-${tier}` : undefined;
  }
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

function itemSlug(image: unknown, name: unknown) {
  if (typeof image === 'string') {
    const match = /^https:\/\/cdn\.notwise\.co\/nft\/items\/img\/([\w-]+)\.(?:png|webp)(?:[?#]|$)/i.exec(image);
    if (match?.[1]) return match[1].toLowerCase();
  }
  return nameToSlug(name);
}

function addPrice(prices: Map<string, Listing>, image: unknown, name: unknown, nano: unknown, nft: unknown) {
  const id = itemSlug(image, name);
  if (!id || typeof nano !== 'string' || !/^\d{1,24}$/.test(nano) ||
      typeof nft !== 'string' || !/^(?:[A-Za-z0-9_-]{48}|0:[0-9a-f]{64})$/i.test(nft)) return;
  const floor = Number(nano) / 1e9;
  if (floor > 0 && floor < (prices.get(id)?.floor ?? Infinity)) {
    prices.set(id, { id, floor, href: getgemsItemLink(nft, itemsCollection) });
  }
}

async function collectionQuote(entry: typeof addresses[number], previous?: CollectionQuote): Promise<CollectionQuote> {
  try {
    const response = await fetch(`${api}/collection/basic-info/${entry.address}`, { signal: AbortSignal.timeout(5500) });
    if (!response.ok) throw new Error('Collection unavailable');
    const result = (await response.json())?.response;
    if (typeof result?.floor !== 'number' || result.floor < 0 || !Number.isFinite(result.floor)) throw new Error('Invalid collection floor');
    const supply = Number.isSafeInteger(result.total_supply) && result.total_supply >= 0 ? result.total_supply as number : null;
    return { ...entry, floor: result.floor || null, supply, available: true, updatedAt: new Date().toISOString() };
  } catch {
    return { ...entry, floor: previous?.floor ?? null, supply: previous?.supply ?? null, updatedAt: previous?.updatedAt ?? null, available: false };
  }
}

async function getgemsListings(token: string, supply: number | null) {
  const prices = new Map<string, Listing>();
  const seen = new Set<string>();
  const maxPages = supply === null ? 40 : Math.ceil(supply / 100) + 3;
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`${api}/nfts/on-sale/${itemsCollection}`);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('after', cursor);
    const response = await fetch(url, { headers: { Authorization: token }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Getgems listings unavailable');
    const result = (await response.json())?.response;
    if (!Array.isArray(result?.items)) throw new Error('Invalid Getgems page');
    for (const row of result.items) {
      if (row?.sale?.type === 'FixPriceSale' && ['TON', 'GRAM'].includes(row.sale.currency)) {
        addPrice(prices, row.image, row.name, row.sale.fullPrice, row.address);
      }
    }
    if (result.cursor === null) return [...prices.values()];
    if (typeof result.cursor !== 'string' || !result.cursor || seen.has(result.cursor)) throw new Error('Invalid Getgems cursor');
    cursor = result.cursor;
    seen.add(result.cursor);
  }
  throw new Error('Getgems listing crawl incomplete');
}

async function tonPage(offset: number): Promise<TonItem[]> {
  const url = `https://tonapi.io/v2/nfts/collections/${itemsCollection}/items?limit=100&offset=${offset}`;
  const token = process.env.TONAPI_TOKEN;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: token ? { Authorization: 'Bearer ' + token } : {}, signal: AbortSignal.timeout(4000) });
      const data = response.ok ? await response.json() : null;
      if (Array.isArray(data?.nft_items)) return data.nft_items;
    } catch { /* Retry an incomplete page. */ }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 350 * 2 ** attempt));
  }
  throw new Error('On-chain listing page unavailable');
}

async function onChainListings(supply: number | null) {
  const prices = new Map<string, Listing>();
  const seen = new Set<string>();
  const maxPages = supply === null ? 40 : Math.ceil(supply / 100) + 3;
  for (let page = 0; page < maxPages; page++) {
    if (page) await new Promise(resolve => setTimeout(resolve, 1000));
    const rows = await tonPage(page * 100);
    for (const row of rows) {
      if (row.address) {
        if (seen.has(row.address)) throw new Error('On-chain page order changed');
        seen.add(row.address);
      }
      if (row.sale?.market?.address === marketWallet && row.sale.price?.currency_type === 'native' && row.sale.price.decimals === 9) {
        addPrice(prices, row.metadata?.image, row.metadata?.name, row.sale.price.value, row.address);
      }
    }
    if (rows.length < 100) return [...prices.values()];
  }
  throw new Error('On-chain listing crawl incomplete');
}

type TonCenterMeta = { token_info?: { type?: string; image?: string; name?: string }[] };
type TonCenterItem = { address: string; on_sale?: boolean; sale_contract_address?: string };
type TonCenterSale = {
  type?: string; address?: string; nft_address?: string; marketplace_address?: string;
  details?: { is_complete?: boolean; full_price?: string };
};

async function toncenterJson<T>(url: URL, token: string): Promise<T> {
  const response = await fetch(url, { headers: { 'X-API-Key': token }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('TON Center returned ' + response.status);
  return response.json() as Promise<T>;
}

async function toncenterListings(token: string, supply: number | null) {
  const base = 'https://toncenter.com/api/v3/nft/';
  const pageSize = 1000;
  const limit = supply === null ? 6 : Math.ceil(supply / pageSize) + 2;
  const listed = new Map<string, { address: string; image?: string; name?: string }>();
  const seen = new Set<string>();
  let finished = false;
  for (let page = 0; page < limit; page++) {
    const url = new URL('items', base);
    url.search = new URLSearchParams({ collection_address: itemsCollection, limit: String(pageSize), offset: String(page * pageSize), sort_by_last_transaction_lt: 'false' }).toString();
    const data = await toncenterJson<{ nft_items: TonCenterItem[]; metadata?: Record<string, TonCenterMeta> }>(url, token);
    if (!Array.isArray(data.nft_items)) throw new Error('Invalid TON Center item page');
    for (const row of data.nft_items) {
      if (typeof row.address !== 'string' || seen.has(row.address)) throw new Error('TON Center pagination changed');
      seen.add(row.address);
      if (!row.on_sale || !row.sale_contract_address) continue;
      const meta = data.metadata?.[row.address]?.token_info?.find(entry => entry.type === 'nft_items');
      listed.set(row.sale_contract_address.toLowerCase(), { address: row.address, image: meta?.image, name: meta?.name });
    }
    if (data.nft_items.length < pageSize) { finished = true; break; }
  }
  if (!finished) throw new Error('TON Center item crawl incomplete');

  const prices = new Map<string, Listing>();
  const contracts = [...listed.keys()];
  for (let i = 0; i < contracts.length; i += 40) {
    if (i) await new Promise(resolve => setTimeout(resolve, 150));
    const url = new URL('sales', base);
    for (const address of contracts.slice(i, i + 40)) url.searchParams.append('address', address);
    const data = await toncenterJson<{ nft_sales: TonCenterSale[]; metadata?: Record<string, TonCenterMeta> }>(url, token);
    if (!Array.isArray(data.nft_sales)) throw new Error('Invalid TON Center sales page');
    for (const sale of data.nft_sales) {
      if (sale.type !== 'getgems_sale' || sale.marketplace_address?.toLowerCase() !== marketWallet || sale.details?.is_complete !== false || !sale.address) continue;
      const item = listed.get(sale.address.toLowerCase());
      if (!item || sale.nft_address?.toLowerCase() !== item.address.toLowerCase()) continue;
      const meta = data.metadata?.[item.address]?.token_info?.find(entry => entry.type === 'nft_items');
      addPrice(prices, item.image ?? meta?.image, item.name ?? meta?.name, sale.details.full_price, item.address);
    }
  }
  return [...prices.values()];
}

async function freshItems(supply: number | null): Promise<ItemsSnapshot> {
  const token = process.env.GETGEMS_READ_TOKEN;
  if (token) {
    try {
      const items = await getgemsListings(token, supply);
      return { items, updatedAt: new Date().toISOString(), status: 'ready', source: 'getgems' };
    } catch (error) {
      console.warn('Getgems item API unavailable', error instanceof Error ? error.message : '');
    }
  }
  const toncenterToken = process.env.TONCENTER_API_KEY;
  if (toncenterToken) {
    try {
      const items = await toncenterListings(toncenterToken, supply);
      return { items, updatedAt: new Date().toISOString(), status: 'ready', source: 'toncenter' };
    } catch (error) {
      console.warn('TON Center item API unavailable', error instanceof Error ? error.message : '');
    }
  }
  return { items: await onChainListings(supply), updatedAt: new Date().toISOString(), status: 'ready', source: 'getgems-on-chain' };
}

async function storedMarket(): Promise<MarketSnapshot | null> {
  try {
    const raw = await redis<string | null>(['GET', snapshotKey]);
    const data: MarketSnapshot | null = raw ? JSON.parse(raw) : null;
    if (data && Array.isArray(data.collections) && Array.isArray(data.items?.items) && data.attemptedAt >= (memory?.attemptedAt ?? 0)) memory = data;
  } catch { /* A running instance can still serve its last snapshot. */ }
  return memory;
}

async function refresh(previous: MarketSnapshot | null) {
  const owner = crypto.randomUUID();
  const locked = await redis<string | null>(['SET', lockKey, owner, 'EX', 115, 'NX']).catch(() => undefined);
  if (locked === null) return previous;
  try {
    const attemptedAt = Date.now();
    const old = new Map(previous?.collections.map(row => [row.id, row]));
    const rows: CollectionQuote[] = [];
    const fetchQuote = (entry: typeof addresses[number]) => collectionQuote(entry, old.get(entry.id));
    const itemQuote = await fetchQuote(addresses.find(row => row.id === 'items')!);
    const itemsTask = freshItems(itemQuote.supply).catch(error => {
      console.warn('NOT Wise item floor unavailable', error instanceof Error ? error.message : '');
      return previous?.items.updatedAt ? { ...previous.items, status: 'stale' as const } : { items: [], status: 'unavailable' as const };
    });
    const remaining = addresses.filter(row => row.id !== 'items');
    for (let i = 0; i < remaining.length; i += 8) {
      rows.push(...await Promise.all(remaining.slice(i, i + 8).map(fetchQuote)));
    }
    const items = await itemsTask;
    const byId = new Map([itemQuote, ...rows].map(row => [row.id, row]));
    const snapshot = { collections: addresses.map(entry => byId.get(entry.id)!), items, attemptedAt };
    memory = snapshot;
    if (locked === 'OK') {
      await redis(['SET', snapshotKey, JSON.stringify(snapshot), 'EX', 86400]);
    }
    return snapshot;
  } finally {
    if (locked === 'OK') await redis(['EVAL', "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end", 1, lockKey, owner]).catch(() => null);
  }
}

async function market(force = false) {
  const previous = await storedMarket();
  if (!force && previous && Date.now() - previous.attemptedAt < interval) return previous;
  refreshInFlight ??= refresh(previous).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function refreshMarket() {
  const snapshot = await market(true);
  const available = snapshot?.collections.filter(row => row.available).length ?? 0;
  return { collections: available, total: addresses.length, itemTypes: snapshot?.items.items.length ?? 0,
    itemsStatus: snapshot?.items.status, itemSource: snapshot?.items.source };
}

export async function collectionQuotes(): Promise<CollectionQuote[]> {
  const snapshot = await market();
  return (snapshot?.collections ?? []).map(row => ({
    ...row, available: row.available && !!row.updatedAt && Date.now() - Date.parse(row.updatedAt) < interval,
  }));
}

export async function itemQuotes(): Promise<ItemsSnapshot> {
  const result = (await market())?.items;
  if (!result) return { items: [], status: 'unavailable' };
  return result.updatedAt && Date.now() - Date.parse(result.updatedAt) >= interval ? { ...result, status: 'stale' } : result;
}
