import { itemCollectionMarketUrl, itemIdToSlug } from '../src/domain/item-market-links.js';
import { redis } from './redis.js';
import collections from '../src/features/market-collections.js';
import stickers from '../src/features/sticker-data.js';

const marketWallet = '0:584ee61b2dff0837116d0fcb5078d93964bcbe9c05fd6a141b1bfca5d6a43e18';
const api = 'https://api.getgems.io/public-api/v1';
const addresses = [...collections, ...stickers.collectionByAlbum.flatMap((address, index) =>
  address ? [{ id: 'album-' + index, address }] : [])];
const itemsCollection = collections.find(row => row.id === 'items')!.address;
const skinsCollection = collections.find(row => row.id === 'skins')!.address;
const snapshotKey = 'notwise:getgems:market:v2';
const explorerKey = 'notwise:getgems:explorer:v1';
const historyPrefix = 'notwise:getgems:hist:v1:';
const historyRetentionSec = 90 * 86400;
const lockKey = snapshotKey + ':lock';
const interval = 15 * 60_000;
const freshWindow = 20 * 60_000;

const webHeaders: HeadersInit = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

type CollectionSource = 'getgems-web' | 'basic-info';
type CollectionQuote = {
  id: string; address: string; floor: number | null; supply: number | null; updatedAt: string | null; available: boolean;
  source?: CollectionSource;
};
type Listing = { id: string; floor: number; href: string };
type ItemSource = 'getgems' | 'toncenter' | 'getgems-on-chain';
type ItemsSnapshot = { items: Listing[]; status: 'ready' | 'stale' | 'unavailable'; updatedAt?: string; source?: ItemSource };
type MarketSnapshot = { collections: CollectionQuote[]; items: ItemsSnapshot; attemptedAt: number };
export type ExplorerLot = { address: string; name: string; price: number; href: string };
export type ExplorerBucket = {
  slug: string; enchant: number; floor: number; count: number; lots: ExplorerLot[];
  change24h?: number | null; change7d?: number | null;
};
export type ExplorerSnapshot = {
  updatedAt: string | null; status: 'ready' | 'stale' | 'unavailable'; source?: ItemSource; buckets: ExplorerBucket[];
};
export type HistoryPoint = { ts: number; floor: number; count: number };
export type HistoryRange = '24h' | '7d' | '30d' | 'all';
type CrawlResult = { items: Listing[]; buckets: ExplorerBucket[] };
type TonItem = {
  address?: string;
  metadata?: { image?: string; name?: string };
  sale?: { market?: { address?: string }; price?: { currency_type?: string; decimals?: number; value?: string } };
};

let memory: MarketSnapshot | null = null;
let memoryExplorer: ExplorerSnapshot | null = null;
let refreshInFlight: Promise<MarketSnapshot | null> | null = null;

function parseEnchant(name: unknown): number {
  if (typeof name !== 'string') return 0;
  const match = /\+(\d{1,2})\s*$/.exec(name.trim());
  if (!match) return 0;
  const level = Number(match[1]);
  return Number.isSafeInteger(level) && level >= 0 && level <= 20 ? level : 0;
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

function itemSlug(image: unknown, name: unknown, contentUri?: unknown) {
  if (typeof image === 'string') {
    const match = /\/items\/img\/([\w-]+)\.(?:png|webp)(?:[?#]|$)/i.exec(image);
    if (match?.[1]) return match[1].toLowerCase();
  }
  if (typeof contentUri === 'string') {
    const match = /\/items\/(\d+)\//i.exec(contentUri);
    if (match?.[1]) {
      const slug = itemIdToSlug[Number(match[1])];
      if (slug) return slug;
    }
  }
  return nameToSlug(name);
}

type BucketAccumulator = {
  slug: string; enchant: number; floor: number; count: number; seen: Set<string>; lots: ExplorerLot[];
};

function recordListing(
  prices: Map<string, Listing>,
  buckets: Map<string, BucketAccumulator>,
  image: unknown,
  name: unknown,
  nano: unknown,
  nft: unknown,
  contentUri?: unknown,
  forcedSlug?: string,
) {
  const id = forcedSlug ?? itemSlug(image, name, contentUri);
  if (!id || typeof nano !== 'string' || !/^\d{1,24}$/.test(nano) ||
      typeof nft !== 'string' || !/^(?:[A-Za-z0-9_-]{48}|0:[0-9a-f]{64})$/i.test(nft)) return;
  const price = Number(nano) / 1e9;
  if (!(price > 0) || !Number.isFinite(price)) return;

  if (!forcedSlug && price < (prices.get(id)?.floor ?? Infinity)) {
    prices.set(id, { id, floor: price, href: itemCollectionMarketUrl(itemsCollection, id) });
  }

  const enchant = parseEnchant(name);
  const key = `${id}:${enchant}`;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { slug: id, enchant, floor: price, count: 0, seen: new Set(), lots: [] };
    buckets.set(key, bucket);
  }
  const addrKey = nft.toLowerCase();
  if (bucket.seen.has(addrKey)) return;
  bucket.seen.add(addrKey);
  bucket.count += 1;
  if (price < bucket.floor) bucket.floor = price;

  const displayName = typeof name === 'string' && name.trim() ? name.trim() : (enchant > 0 ? `${id} +${enchant}` : id);
  const lot: ExplorerLot = { address: nft, name: displayName, price, href: `https://getgems.io/nft/${nft}` };
  // Keep top 12 cheapest lots per (slug, enchant) bucket.
  if (bucket.lots.length < 12) {
    bucket.lots.push(lot);
    bucket.lots.sort((a, b) => a.price - b.price);
  } else if (price < bucket.lots[bucket.lots.length - 1].price) {
    bucket.lots[bucket.lots.length - 1] = lot;
    bucket.lots.sort((a, b) => a.price - b.price);
  }
}

function finalizeBuckets(buckets: Map<string, BucketAccumulator>): ExplorerBucket[] {
  return [...buckets.values()]
    .map(({ slug, enchant, floor, count, lots }) => ({ slug, enchant, floor, count, lots }))
    .sort((a, b) => a.slug.localeCompare(b.slug) || a.enchant - b.enchant);
}

async function fetchGetgemsWebStats(address: string): Promise<{ floor: number | null; supply: number | null } | null> {
  const response = await fetch(`https://getgems.io/collection/${address}`, {
    headers: webHeaders,
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) return null;
  const html = await response.text();
  const match = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!match?.[1]) return null;
  const rootQuery = JSON.parse(match[1])?.props?.pageProps?.gqlCache?.ROOT_QUERY;
  if (!rootQuery || typeof rootQuery !== 'object') return null;
  const statsKey = Object.keys(rootQuery).find(key => key.startsWith('alphaNftCollectionStats('));
  const stats = statsKey ? rootQuery[statsKey] : null;
  if (!stats || typeof stats.floorPrice !== 'number' || !Number.isFinite(stats.floorPrice) || stats.floorPrice < 0) {
    return null;
  }
  const supply = Number.isSafeInteger(stats.itemsCount) && stats.itemsCount >= 0 ? stats.itemsCount as number : null;
  return { floor: stats.floorPrice > 0 ? stats.floorPrice : null, supply };
}

async function collectionQuote(entry: typeof addresses[number], previous?: CollectionQuote): Promise<CollectionQuote> {
  try {
    // Getgems SSR stats match the live marketplace floor; public-api basic-info can lag behind actual listings.
    const web = await fetchGetgemsWebStats(entry.address).catch(() => null);
    if (web) {
      return { ...entry, floor: web.floor, supply: web.supply, available: true, source: 'getgems-web', updatedAt: new Date().toISOString() };
    }
    const response = await fetch(`${api}/collection/basic-info/${entry.address}`, { signal: AbortSignal.timeout(5500) });
    if (!response.ok) throw new Error('Collection unavailable');
    const result = (await response.json())?.response;
    if (typeof result?.floor !== 'number' || result.floor < 0 || !Number.isFinite(result.floor)) throw new Error('Invalid collection floor');
    const supply = Number.isSafeInteger(result.total_supply) && result.total_supply >= 0 ? result.total_supply as number : null;
    return { ...entry, floor: result.floor || null, supply, available: true, source: 'basic-info', updatedAt: new Date().toISOString() };
  } catch {
    return {
      ...entry, floor: previous?.floor ?? null, supply: previous?.supply ?? null,
      updatedAt: previous?.updatedAt ?? null, available: false, source: previous?.source,
    };
  }
}

async function getgemsCollectionCrawl(
  token: string,
  collectionAddress: string,
  maxPages: number,
  prices: Map<string, Listing>,
  buckets: Map<string, BucketAccumulator>,
  forcedSlug?: string,
) {
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`${api}/nfts/on-sale/${collectionAddress}`);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('after', cursor);
    const response = await fetch(url, { headers: { Authorization: token }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Getgems listings unavailable');
    const result = (await response.json())?.response;
    if (!Array.isArray(result?.items)) throw new Error('Invalid Getgems page');
    for (const row of result.items) {
      if (row?.sale?.type === 'FixPriceSale' && ['TON', 'GRAM'].includes(row.sale.currency)) {
        recordListing(prices, buckets, row.image, row.name, row.sale.fullPrice, row.address, undefined, forcedSlug);
      }
    }
    if (result.cursor === null) return;
    if (typeof result.cursor !== 'string' || !result.cursor || seen.has(result.cursor)) throw new Error('Invalid Getgems cursor');
    cursor = result.cursor;
    seen.add(result.cursor);
  }
  if (!forcedSlug) throw new Error('Getgems listing crawl incomplete');
}

async function getgemsListings(token: string, supply: number | null): Promise<CrawlResult> {
  const prices = new Map<string, Listing>();
  const buckets = new Map<string, BucketAccumulator>();
  const maxPages = supply === null ? 40 : Math.ceil(supply / 100) + 3;
  await getgemsCollectionCrawl(token, itemsCollection, maxPages, prices, buckets);
  // Best-effort crawl of NOT Wise: Skins for enchanted skin floor tracking.
  await getgemsCollectionCrawl(token, skinsCollection, 15, prices, buckets, 'owl-skin').catch(() => null);
  return { items: [...prices.values()], buckets: finalizeBuckets(buckets) };
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

async function onChainListings(supply: number | null): Promise<CrawlResult> {
  const prices = new Map<string, Listing>();
  const buckets = new Map<string, BucketAccumulator>();
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
        recordListing(prices, buckets, row.metadata?.image, row.metadata?.name, row.sale.price.value, row.address);
      }
    }
    if (rows.length < 100) return { items: [...prices.values()], buckets: finalizeBuckets(buckets) };
  }
  throw new Error('On-chain listing crawl incomplete');
}

type TonCenterMeta = { token_info?: { type?: string; image?: string; name?: string }[] };
type TonCenterItem = { address: string; on_sale?: boolean; sale_contract_address?: string; content?: { uri?: string } };
type TonCenterSale = {
  type?: string; address?: string; nft_address?: string; marketplace_address?: string;
  details?: { is_complete?: boolean; full_price?: string };
  nft_item?: { content?: { uri?: string } };
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
  const listed = new Map<string, { address: string; image?: string; name?: string; contentUri?: string }>();
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
      listed.set(row.sale_contract_address.toLowerCase(), {
        address: row.address, image: meta?.image, name: meta?.name, contentUri: row.content?.uri,
      });
    }
    if (data.nft_items.length < pageSize) { finished = true; break; }
  }
  if (!finished) throw new Error('TON Center item crawl incomplete');

  const prices = new Map<string, Listing>();
  const buckets = new Map<string, BucketAccumulator>();
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
      recordListing(
        prices,
        buckets,
        item.image ?? meta?.image,
        item.name ?? meta?.name,
        sale.details.full_price,
        item.address,
        item.contentUri ?? sale.nft_item?.content?.uri,
      );
    }
  }
  return { items: [...prices.values()], buckets: finalizeBuckets(buckets) };
}

type FreshItemsResult = { snapshot: ItemsSnapshot; buckets: ExplorerBucket[] | null };

async function freshItems(supply: number | null): Promise<FreshItemsResult> {
  const token = process.env.GETGEMS_READ_TOKEN;
  if (token) {
    try {
      const crawled = await getgemsListings(token, supply);
      return {
        snapshot: { items: crawled.items, updatedAt: new Date().toISOString(), status: 'ready', source: 'getgems' },
        buckets: crawled.buckets,
      };
    } catch (error) {
      console.warn('Getgems item API unavailable', error instanceof Error ? error.message : '');
    }
  }
  const toncenterToken = process.env.TONCENTER_API_KEY;
  if (toncenterToken) {
    try {
      const crawled = await toncenterListings(toncenterToken, supply);
      return {
        snapshot: { items: crawled.items, updatedAt: new Date().toISOString(), status: 'ready', source: 'toncenter' },
        buckets: crawled.buckets,
      };
    } catch (error) {
      console.warn('TON Center item API unavailable', error instanceof Error ? error.message : '');
    }
  }
  const crawled = await onChainListings(supply);
  return {
    snapshot: { items: crawled.items, updatedAt: new Date().toISOString(), status: 'ready', source: 'getgems-on-chain' },
    buckets: crawled.buckets,
  };
}

async function storedMarket(): Promise<MarketSnapshot | null> {
  try {
    const raw = await redis<string | null>(['GET', snapshotKey]);
    const data: MarketSnapshot | null = raw ? JSON.parse(raw) : null;
    if (data && Array.isArray(data.collections) && Array.isArray(data.items?.items) && data.attemptedAt >= (memory?.attemptedAt ?? 0)) memory = data;
  } catch { /* A running instance can still serve its last snapshot. */ }
  return memory;
}

async function storedExplorer(): Promise<ExplorerSnapshot | null> {
  try {
    const raw = await redis<string | null>(['GET', explorerKey]);
    const data: ExplorerSnapshot | null = raw ? JSON.parse(raw) : null;
    if (data && Array.isArray(data.buckets)) memoryExplorer = data;
  } catch { /* Fallback to in-memory snapshot. */ }
  return memoryExplorer;
}

async function recordHistory(attemptedAt: number, buckets: ExplorerBucket[] | null, cols: CollectionQuote[]) {
  const hourKey = String(Math.floor(attemptedAt / 3_600_000));
  const entries: { key: string; val: string }[] = [];
  for (const b of buckets ?? []) {
    if (b.floor > 0 && Number.isFinite(b.floor)) {
      entries.push({ key: `${historyPrefix}${b.slug}:${b.enchant}`, val: `${b.floor}|${b.count}` });
    }
  }
  for (const col of cols) {
    if (col.available && col.floor && col.floor > 0 && Number.isFinite(col.floor)) {
      entries.push({ key: `${historyPrefix}col:${col.id}:0`, val: `${col.floor}|${col.supply ?? 0}` });
    }
  }
  for (let i = 0; i < entries.length; i += 12) {
    const chunk = entries.slice(i, i + 12);
    await Promise.all(chunk.map(async ({ key, val }) => {
      await redis(['HSET', key, hourKey, val]).catch(() => null);
      await redis(['EXPIRE', key, historyRetentionSec]).catch(() => null);
    }));
  }
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
    const itemsTask = freshItems(itemQuote.supply).catch((error): FreshItemsResult => {
      console.warn('NOT Wise item floor unavailable', error instanceof Error ? error.message : '');
      const fallback: ItemsSnapshot = previous?.items.updatedAt
        ? { ...previous.items, status: 'stale' as const }
        : { items: [], status: 'unavailable' as const };
      return { snapshot: fallback, buckets: null };
    });
    const remaining = addresses.filter(row => row.id !== 'items');
    for (let i = 0; i < remaining.length; i += 4) {
      if (i) await new Promise(resolve => setTimeout(resolve, 120));
      rows.push(...await Promise.all(remaining.slice(i, i + 4).map(fetchQuote)));
    }
    const itemsResult = await itemsTask;
    const byId = new Map([itemQuote, ...rows].map(row => [row.id, row]));
    const allCols = addresses.map(entry => byId.get(entry.id)!);
    const snapshot = { collections: allCols, items: itemsResult.snapshot, attemptedAt };
    memory = snapshot;
    if (itemsResult.buckets) {
      memoryExplorer = {
        updatedAt: itemsResult.snapshot.updatedAt ?? new Date(attemptedAt).toISOString(),
        status: itemsResult.snapshot.status,
        source: itemsResult.snapshot.source,
        buckets: itemsResult.buckets,
      };
    }
    if (locked === 'OK') {
      await redis(['SET', snapshotKey, JSON.stringify(snapshot), 'EX', 86400]);
      if (memoryExplorer) {
        await redis(['SET', explorerKey, JSON.stringify(memoryExplorer), 'EX', 86400]).catch(() => null);
      }
      await recordHistory(attemptedAt, itemsResult.buckets, allCols).catch(() => null);
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
    itemsStatus: snapshot?.items.status, itemSource: snapshot?.items.source,
    explorerBuckets: memoryExplorer?.buckets.length ?? 0 };
}

export async function collectionQuotes(): Promise<CollectionQuote[]> {
  const snapshot = await market();
  return (snapshot?.collections ?? []).map(row => ({
    ...row, available: row.available && !!row.updatedAt && Date.now() - Date.parse(row.updatedAt) < freshWindow,
  }));
}

export async function itemQuotes(): Promise<ItemsSnapshot> {
  const result = (await market())?.items;
  if (!result) return { items: [], status: 'unavailable' };
  return result.updatedAt && Date.now() - Date.parse(result.updatedAt) >= freshWindow ? { ...result, status: 'stale' } : result;
}

function parseHistoryHash(raw: Record<string, string> | string[] | null): HistoryPoint[] {
  if (!raw) return [];
  const entries: [string, string][] = Array.isArray(raw)
    ? Array.from({ length: Math.floor(raw.length / 2) }, (_, i) => [raw[i * 2], raw[i * 2 + 1]])
    : Object.entries(raw);
  const points: HistoryPoint[] = [];
  for (const [hourStr, val] of entries) {
    const hour = Number(hourStr);
    if (!Number.isSafeInteger(hour) || hour <= 0 || typeof val !== 'string') continue;
    const [floorStr, countStr] = val.split('|');
    const floor = Number(floorStr);
    const count = Number(countStr ?? '0');
    if (floor > 0 && Number.isFinite(floor)) {
      points.push({ ts: hour * 3_600_000, floor, count: Number.isFinite(count) ? count : 0 });
    }
  }
  points.sort((a, b) => a.ts - b.ts);
  return points;
}

export async function marketExplorer(): Promise<ExplorerSnapshot> {
  let explorer = await storedExplorer();
  if (!explorer || !explorer.buckets.length) {
    await market(true);
    explorer = await storedExplorer();
  } else {
    await market();
    explorer = await storedExplorer() ?? explorer;
  }
  if (!explorer) {
    return { updatedAt: null, status: 'unavailable', buckets: [] };
  }
  const stale = !!explorer.updatedAt && Date.now() - Date.parse(explorer.updatedAt) >= freshWindow;
  return {
    ...explorer,
    status: stale && explorer.status === 'ready' ? 'stale' : explorer.status,
  };
}

export async function marketHistory(
  slug: string,
  enchant: number,
  range: HistoryRange,
): Promise<{ slug: string; enchant: number; range: HistoryRange; points: HistoryPoint[] }> {
  const safeSlug = /^[a-z0-9:-]{1,48}$/.test(slug) ? slug : '';
  const safeEnchant = Number.isSafeInteger(enchant) && enchant >= 0 && enchant <= 20 ? enchant : 0;
  if (!safeSlug) return { slug: '', enchant: 0, range, points: [] };
  const key = `${historyPrefix}${safeSlug}:${safeEnchant}`;
  let points: HistoryPoint[] = [];
  try {
    const raw = await redis<Record<string, string> | string[] | null>(['HGETALL', key]);
    points = parseHistoryHash(raw);
  } catch { /* Redis unavailable */ }
  const now = Date.now();
  const windowMs = range === '24h' ? 86_400_000 : range === '7d' ? 7 * 86_400_000 : range === '30d' ? 30 * 86_400_000 : Infinity;
  const filtered = Number.isFinite(windowMs) ? points.filter(p => now - p.ts <= windowMs) : points;
  return { slug: safeSlug, enchant: safeEnchant, range, points: filtered };
}

export async function marketDiagnostics() {
  const snapshot = await market();
  const now = Date.now();
  const cols = (snapshot?.collections ?? []).map(row => ({
    id: row.id,
    name: 'name' in row ? (row as { name?: string }).name ?? row.id : row.id,
    floor: row.floor,
    supply: row.supply,
    updatedAt: row.updatedAt,
    source: row.source ?? null,
    available: row.available && !!row.updatedAt && now - Date.parse(row.updatedAt) < freshWindow,
  }));
  const rawItems = snapshot?.items;
  const itemsStale = rawItems?.updatedAt && now - Date.parse(rawItems.updatedAt) >= freshWindow;
  const items = rawItems
    ? {
        status: itemsStale && rawItems.status === 'ready' ? 'stale' : rawItems.status,
        source: rawItems.source ?? null,
        updatedAt: rawItems.updatedAt ?? null,
        items: rawItems.items.map(({ id, floor }) => ({ id, floor })).sort((a, b) => a.floor - b.floor),
      }
    : { status: 'unavailable' as const, source: null, updatedAt: null, items: [] };
  return {
    attemptedAt: snapshot?.attemptedAt ?? null,
    fresh: !!snapshot?.attemptedAt && now - snapshot.attemptedAt < freshWindow,
    intervalMinutes: interval / 60_000,
    collections: cols,
    items,
  };
}
