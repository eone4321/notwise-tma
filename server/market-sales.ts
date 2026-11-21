import { itemIdToSlug } from '../src/domain/item-market-links.js';
import { getgemsNftUrl } from '../src/domain/ton-address.js';
import collections from '../src/features/market-collections.js';
import stickers from '../src/features/sticker-data.js';
import { redis } from './redis.js';

export const SALES_HASH_KEY = 'notwise:market:sales:v8:by_slug';
export const SALES_WATERMARK_KEY = 'notwise:market:sales:v8:watermarks';
export const SALES_RETENTION_MS = 30 * 86400_000;
export const SALES_FRESH_MS = 10 * 60_000;
export const MAX_SALES_PER_SLUG = 48;

const GETGEMS_API = 'https://api.getgems.io/public-api/v1';
const ZERO_ADDR = '0:0000000000000000000000000000000000000000000000000000000000000000';

export type MarketSale = {
  address: string;
  name: string;
  price: number;
  currency: string;
  at: number;
  image?: string;
  href: string;
};

export type CachedSlugSales = {
  updatedAt: number;
  complete30d?: boolean;
  sales: MarketSale[];
};

type CollectionWatermark = {
  latestSec: number;
  backfilledUntilSec: number;
  collectionSlug?: string;
  complete30d?: boolean;
};

const friendlyRe = /^[A-Za-z0-9_-]{48}$/;
const rawRe = /^-?\d+:[0-9a-f]{64}$/i;

export function toRawAddress(addr: string): string {
  const trimmed = addr.trim();
  if (rawRe.test(trimmed)) return trimmed.toLowerCase();
  if (!friendlyRe.test(trimmed)) return '';
  try {
    const bytes = atob(trimmed.replaceAll('-', '+').replaceAll('_', '/')).slice(2, 34);
    return '0:' + Array.from(bytes, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

export function parseEnchant(name: unknown): number {
  if (typeof name !== 'string') return 0;
  const match = /\+(\d{1,2})\s*$/.exec(name.trim());
  if (!match) return 0;
  const level = Number(match[1]);
  return Number.isSafeInteger(level) && level >= 0 && level <= 20 ? level : 0;
}

export function nameToSlug(name: unknown): string | undefined {
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
  if (n.includes('voucher')) {
    if (/(?:100k|100[,\s._]*000)\b/.test(n)) return 'voucher-100k';
    if (/(?:10k|10[,\s._]*000)\b/.test(n)) return 'voucher-10k';
  }
  if (n.includes('floppy')) {
    if (/(?:1b|1[,\s._]*000[,\s._]*000[,\s._]*000)\b/.test(n)) return 'floppy-1b';
    if (/(?:100m|100[,\s._]*000[,\s._]*000)\b/.test(n)) return 'floppy-100m';
    if (/(?:10m|10[,\s._]*000[,\s._]*000)\b/.test(n)) return 'floppy-10m';
    if (/(?:1m|1[,\s._]*000[,\s._]*000)\b/.test(n)) return 'floppy-1m';
    if (/(?:100k|100[,\s._]*000)\b/.test(n)) return 'floppy-100k';
    if (n.includes('empty')) return 'floppy-empty';
  }
  if (n.includes('flask')) {
    if (n.includes('empty')) return 'flask-empty';
    if (n.includes('half')) return 'flask-half';
    if (n.includes('full')) return 'flask-full';
  }
}

export function resolveItemSlug(image: unknown, name: unknown, contentUri?: unknown): string | undefined {
  if (typeof image === 'string') {
    const match = /\/items\/img\/([\w-]+)\.(?:png|webp)(?:[?#]|$)/i.exec(image);
    if (match?.[1]) return match[1].toLowerCase();
  }
  if (typeof contentUri === 'string') {
    const match = /\/(?:items|exp|vouchers)\/(\d+)\//i.exec(contentUri);
    if (match?.[1]) {
      const slug = itemIdToSlug[Number(match[1])];
      if (slug) return slug;
    }
  }
  return nameToSlug(name);
}

export function normalizeCurrency(raw: unknown): string {
  if (typeof raw !== 'string') return 'GRAM';
  const c = raw.trim();
  if (!c) return 'GRAM';
  const upper = c.toUpperCase().replace(/^\$/, '');
  if (upper === 'TON' || upper === 'TONCOIN' || upper === 'GRAM') return 'GRAM';
  if (upper === 'USD₮' || upper === 'USDT') return 'USDT';
  return upper;
}

export function inferSaleImage(slug: string, name: string, rawImage: unknown): string | undefined {
  if (typeof rawImage === 'string' && /^https:\/\/[\w.-]+\//i.test(rawImage)) return rawImage;
  if (slug === 'owl-skin' || slug === 'col:skins') {
    const match = /#(\d{1,6})/.exec(name);
    if (match?.[1]) return `https://cdn.notwise.co/nft/skins/svg/${match[1]}.svg`;
  }
  return undefined;
}

export function resolveCollectionTarget(slug: string): {
  address: string;
  filterBySlug: boolean;
  collectionSlug: string;
} | null {
  if (slug === 'owl-skin') {
    const col = collections.find(c => c.id === 'skins');
    return col ? { address: col.address, filterBySlug: false, collectionSlug: 'owl-skin' } : null;
  }
  if (slug.startsWith('col:album-')) {
    const id = Number(slug.slice('col:album-'.length));
    const addr = stickers.collectionByAlbum[id];
    return addr ? { address: addr, filterBySlug: false, collectionSlug: slug } : null;
  }
  if (slug.startsWith('col:')) {
    const id = slug.slice(4);
    const col = collections.find(c => c.id === id);
    return col ? { address: col.address, filterBySlug: false, collectionSlug: slug } : null;
  }
  if (slug.startsWith('floppy-')) {
    const col = collections.find(c => c.id === 'exp');
    if (col) return { address: col.address, filterBySlug: true, collectionSlug: 'col:exp' };
  }
  if (slug.startsWith('voucher-')) {
    const col = collections.find(c => c.id === 'vouchers');
    if (col) return { address: col.address, filterBySlug: true, collectionSlug: 'col:vouchers' };
  }
  const items = collections.find(c => c.id === 'items');
  return items ? { address: items.address, filterBySlug: true, collectionSlug: 'col:items' } : null;
}

export const collectionSlugByRaw = new Map<string, string>();
for (const col of collections) {
  const raw = toRawAddress(col.address);
  if (raw) collectionSlugByRaw.set(raw, col.id === 'skins' ? 'owl-skin' : `col:${col.id}`);
}
stickers.collectionByAlbum.forEach((addr, idx) => {
  if (!addr) return;
  const raw = toRawAddress(addr);
  if (raw) collectionSlugByRaw.set(raw, `col:album-${idx}`);
});

export function mergeSales(incoming: MarketSale[], existing: MarketSale[], minAtMs: number): MarketSale[] {
  const seen = new Set<string>();
  const out: MarketSale[] = [];
  for (const s of [...incoming, ...existing]) {
    if (!s || !Number.isFinite(s.at) || s.at < minAtMs || !Number.isFinite(s.price) || s.price <= 0) continue;
    const addr = toRawAddress(s.address) || s.address.toLowerCase();
    const key = `${addr}:${Math.round(s.at / 1000)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.sort((a, b) => b.at - a.at).slice(0, MAX_SALES_PER_SLUG);
}

async function fetchJsonWithRetry(url: string, headers: HeadersInit, hasApiKey: boolean): Promise<any> {
  let res = await fetch(url, { headers, signal: AbortSignal.timeout(5500) });
  if (res.status === 429) {
    await new Promise(resolve => setTimeout(resolve, hasApiKey ? 350 : 1100));
    res = await fetch(url, { headers, signal: AbortSignal.timeout(5500) });
  }
  return res.ok ? await res.json() : null;
}

type CandidateTransfer = {
  nftAddress: string;
  newOwner: string;
  utime: number;
  name?: string;
  image?: string;
  mappedSlug?: string;
};

export type ToncenterScanResult = {
  bySlug: Map<string, MarketSale[]>;
  reachedEnd: boolean;
  oldestUtime: number | null;
  newestUtime: number | null;
};

/**
 * Scan genuine Getgems marketplace sales for a TON collection using TON Center v3:
 * 1) Paginate `/v3/nft/transfers` page-by-page (includes NFT metadata in the same call), skipping mints/burns.
 * 2) When `targetSlug` is provided (`filterBySlug`), filter transfers by slug metadata BEFORE querying sales.
 * 3) Query `/v3/nft/sales` immediately for each page's `old_owner` contracts in batches of 80, verifying:
 *    - `getgems_sale` with `details.is_complete === true` OR `getgems_auction` with `end_flag && !is_canceled`
 *    - `tr.newOwner !== sale.nft_owner_address` (strictly excludes cancelled listings!)
 *    Only advances `oldestUtime` after all sales batches for a page complete so watermarks never skip unverified pages.
 */
export async function scanToncenterCollectionSales(opts: {
  collectionAddress: string;
  collectionSlug: string;
  filterBySlug: boolean;
  targetSlug?: string;
  sinceSec: number;
  untilSec?: number;
  maxPages: number;
  timeBudgetMs: number;
}): Promise<ToncenterScanResult> {
  const toncenterToken = process.env.TONCENTER_API_KEY || process.env.TONCENTER_TOKEN;
  const hasKey = Boolean(toncenterToken);
  const headers: HeadersInit = toncenterToken ? { 'X-API-Key': toncenterToken } : {};
  const paceMs = hasKey ? 120 : 1050;
  const deadline = Date.now() + opts.timeBudgetMs;

  const bySlug = new Map<string, MarketSale[]>();
  const seenSaleKeys = new Set<string>();
  const verifiedContracts = new Set<string>();
  let reachedEnd = false;
  let oldestUtime: number | null = null;
  let newestUtime: number | null = null;

  for (let page = 0; page < opts.maxPages; page++) {
    if (page > 0) {
      if (Date.now() > deadline - 1200) break;
      await new Promise(resolve => setTimeout(resolve, paceMs));
    }

    const params = new URLSearchParams({
      collection_address: opts.collectionAddress,
      start_utime: String(opts.sinceSec),
      limit: '1000',
      offset: String(page * 1000),
      sort: 'desc',
    });
    if (typeof opts.untilSec === 'number' && opts.untilSec > opts.sinceSec) {
      params.set('end_utime', String(opts.untilSec));
    }

    const trData: any = await fetchJsonWithRetry(
      `https://toncenter.com/api/v3/nft/transfers?${params.toString()}`,
      headers,
      hasKey,
    ).catch(() => null);

    const transfers = Array.isArray(trData?.nft_transfers) ? trData.nft_transfers : null;
    if (!transfers) break;

    const meta = trData?.metadata && typeof trData.metadata === 'object' ? trData.metadata : {};
    const pageOwnerMap = new Map<string, CandidateTransfer[]>();
    let pageOldest: number | null = null;
    let pageNewest: number | null = null;

    for (const t of transfers) {
      const utime = Number(t?.transaction_now ?? 0);
      if (utime > 0) {
        if (pageNewest === null || utime > pageNewest) pageNewest = utime;
        if (pageOldest === null || utime < pageOldest) pageOldest = utime;
      }
      if (!t?.old_owner || !t?.new_owner || t.new_owner === ZERO_ADDR || !t?.nft_address) continue;

      const tokenInfos: any[] = Array.isArray(meta?.[t.nft_address]?.token_info) ? meta[t.nft_address].token_info : [];
      const info = tokenInfos.find(e => e?.type === 'nft_items') ?? tokenInfos[0];
      const name = typeof info?.name === 'string' && info.name.trim() ? info.name.trim() : undefined;
      const image = typeof info?.image === 'string' ? info.image : undefined;
      const infoUri = typeof info?.extra?.uri === 'string' ? info.extra.uri : undefined;
      const mappedSlug = opts.filterBySlug ? resolveItemSlug(image, name, infoUri) : opts.collectionSlug;

      if (opts.filterBySlug && opts.targetSlug && mappedSlug && mappedSlug !== opts.targetSlug) {
        continue;
      }

      const key = String(t.old_owner).toLowerCase();
      const cand: CandidateTransfer = {
        nftAddress: String(t.nft_address),
        newOwner: String(t.new_owner),
        utime,
        name,
        image,
        mappedSlug,
      };
      const arr = pageOwnerMap.get(key);
      if (arr) arr.push(cand);
      else pageOwnerMap.set(key, [cand]);
    }

    const pageContracts = [...pageOwnerMap.keys()].filter(k => !verifiedContracts.has(k));
    let pageVerifiedOk = true;

    for (let i = 0; i < pageContracts.length; i += 80) {
      if (i > 0 || page > 0 || pageContracts.length > 0) {
        if (Date.now() > deadline) {
          pageVerifiedOk = false;
          break;
        }
        if (i > 0 || pageContracts.length > 0) {
          await new Promise(resolve => setTimeout(resolve, paceMs));
        }
      }

      const batch = pageContracts.slice(i, i + 80);
      const sParams = new URLSearchParams();
      for (const addr of batch) sParams.append('address', addr);

      const salesData: any = await fetchJsonWithRetry(
        `https://toncenter.com/api/v3/nft/sales?${sParams.toString()}`,
        headers,
        hasKey,
      ).catch(() => null);

      if (!salesData || !Array.isArray(salesData?.nft_sales)) {
        pageVerifiedOk = false;
        break;
      }

      for (const addr of batch) verifiedContracts.add(addr);
      const nftSales: any[] = salesData.nft_sales;
      const salesMeta = salesData?.metadata && typeof salesData.metadata === 'object' ? salesData.metadata : {};

      for (const sale of nftSales) {
        const saleAddr = typeof sale?.address === 'string' ? sale.address.toLowerCase() : '';
        const nftAddr = typeof sale?.nft_address === 'string' ? sale.nft_address : '';
        if (!saleAddr || !nftAddr) continue;

        const sellerOwner = typeof sale?.nft_owner_address === 'string' ? sale.nft_owner_address.toLowerCase() : '';
        const cands = pageOwnerMap.get(saleAddr)?.filter(c => c.nftAddress.toLowerCase() === nftAddr.toLowerCase()) ?? [];
        const tr = cands.find(c => c.utime > 0 && (!sellerOwner || c.newOwner.toLowerCase() !== sellerOwner));
        if (!tr) continue;

        let priceNanoStr = '';
        if (sale.type === 'getgems_sale' && sale.details?.is_complete === true) {
          priceNanoStr = String(sale.details.full_price ?? '');
        } else if (
          sale.type === 'getgems_auction' &&
          sale.details?.end_flag === true &&
          sale.details?.is_canceled === false &&
          sale.details?.last_member
        ) {
          priceNanoStr = String(sale.details.last_bid ?? '');
        } else {
          continue;
        }

        if (!/^\d{1,24}$/.test(priceNanoStr)) continue;
        const price = Number(priceNanoStr) / 1e9;
        if (!Number.isFinite(price) || price <= 0) continue;

        const salesInfos: any[] = Array.isArray(salesMeta?.[nftAddr]?.token_info) ? salesMeta[nftAddr].token_info : [];
        const tokenInfo = salesInfos.find(e => e?.type === 'nft_items') ?? salesInfos[0];
        const name = (typeof tokenInfo?.name === 'string' && tokenInfo.name.trim())
          ? tokenInfo.name.trim()
          : (tr.name ?? opts.collectionSlug);
        const rawImage = tr.image ?? tokenInfo?.image;
        const contentUri = sale?.nft_item?.content?.uri ?? tokenInfo?.extra?.uri;
        const resolvedItemSlug = opts.filterBySlug
          ? (tr.mappedSlug ?? resolveItemSlug(rawImage, name, contentUri))
          : opts.collectionSlug;

        const dedupeKey = `${saleAddr}:${nftAddr.toLowerCase()}:${tr.utime}`;
        if (seenSaleKeys.has(dedupeKey)) continue;
        seenSaleKeys.add(dedupeKey);

        const primarySlug = resolvedItemSlug ?? opts.collectionSlug;
        const saleObj: MarketSale = {
          address: nftAddr,
          name,
          price,
          currency: 'GRAM',
          at: tr.utime * 1000,
          image: inferSaleImage(primarySlug, name, rawImage),
          href: getgemsNftUrl(nftAddr) || `https://getgems.io/collection/${opts.collectionAddress}`,
        };

        const pushTo = (bucketSlug: string) => {
          if (opts.targetSlug && bucketSlug !== opts.targetSlug) return;
          const arr = bySlug.get(bucketSlug);
          if (arr) arr.push(saleObj);
          else bySlug.set(bucketSlug, [saleObj]);
        };

        if (opts.filterBySlug) {
          if (resolvedItemSlug) pushTo(resolvedItemSlug);
          if (!opts.targetSlug || opts.targetSlug === opts.collectionSlug) {
            pushTo(opts.collectionSlug);
          }
        } else {
          pushTo(opts.collectionSlug);
          if (opts.collectionSlug === 'owl-skin' && (!opts.targetSlug || opts.targetSlug === 'col:skins')) {
            pushTo('col:skins');
          } else if (opts.collectionSlug === 'col:skins' && (!opts.targetSlug || opts.targetSlug === 'owl-skin')) {
            pushTo('owl-skin');
          }
        }
      }
    }

    if (!pageVerifiedOk) break;

    if (pageNewest !== null && (newestUtime === null || pageNewest > newestUtime)) newestUtime = pageNewest;
    if (pageOldest !== null && (oldestUtime === null || pageOldest < oldestUtime)) oldestUtime = pageOldest;

    if (transfers.length < 1000) {
      reachedEnd = true;
      break;
    }
    if (opts.targetSlug && (bySlug.get(opts.targetSlug)?.length ?? 0) >= MAX_SALES_PER_SLUG) {
      break;
    }
  }

  for (const [k, list] of bySlug.entries()) {
    list.sort((a, b) => b.at - a.at);
    if (list.length > MAX_SALES_PER_SLUG) bySlug.set(k, list.slice(0, MAX_SALES_PER_SLUG));
  }

  return { bySlug, reachedEnd, oldestUtime, newestUtime };
}

export async function scanGetgemsCollectionSales(opts: {
  collectionAddress: string;
  collectionSlug: string;
  filterBySlug: boolean;
  targetSlug?: string;
  minMs: number;
  maxMs: number;
  maxPages: number;
  timeBudgetMs: number;
}): Promise<{ bySlug: Map<string, MarketSale[]>; reachedEnd: boolean } | null> {
  const token = process.env.GETGEMS_READ_TOKEN;
  if (!token) return null;

  const deadline = Date.now() + opts.timeBudgetMs;
  const bySlug = new Map<string, MarketSale[]>();
  let cursor: string | null = null;
  let reachedEnd = false;
  let anyOk = false;

  try {
    for (let page = 0; page < opts.maxPages; page++) {
      if (page > 0 && Date.now() > deadline) break;
      const apiUrl = new URL(`${GETGEMS_API}/collection/history/${opts.collectionAddress}`);
      apiUrl.searchParams.set('minTime', String(opts.minMs));
      apiUrl.searchParams.set('maxTime', String(opts.maxMs));
      apiUrl.searchParams.set('limit', '100');
      apiUrl.searchParams.set('types', 'sold');
      if (cursor) apiUrl.searchParams.set('after', cursor);

      const res = await fetch(apiUrl, {
        headers: { Authorization: token },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) break;
      const data = await res.json();
      const items = data?.response?.items;
      if (!Array.isArray(items)) break;
      anyOk = true;

      for (const row of items) {
        if (row?.typeData?.type !== 'sold') continue;
        const price = Number(row.typeData.price);
        if (!Number.isFinite(price) || price <= 0) continue;
        const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : opts.collectionSlug;
        const at = Date.parse(row.time);
        if (!Number.isFinite(at) || at <= 0) continue;
        const itemSlug = opts.filterBySlug ? resolveItemSlug(row.image, name, undefined) : opts.collectionSlug;
        if (opts.filterBySlug && opts.targetSlug && itemSlug !== opts.targetSlug && opts.targetSlug !== opts.collectionSlug) {
          continue;
        }
        const addr = String(row.address ?? '');
        const primarySlug = itemSlug ?? opts.collectionSlug;
        const saleObj: MarketSale = {
          address: addr,
          name,
          price,
          currency: normalizeCurrency(row.typeData.currency),
          at,
          image: inferSaleImage(primarySlug, name, row.image),
          href: addr ? getgemsNftUrl(addr) : `https://getgems.io/collection/${opts.collectionAddress}`,
        };

        const pushTo = (bucketSlug: string) => {
          if (opts.targetSlug && bucketSlug !== opts.targetSlug) return;
          const arr = bySlug.get(bucketSlug);
          if (arr) arr.push(saleObj);
          else bySlug.set(bucketSlug, [saleObj]);
        };

        if (opts.filterBySlug) {
          if (itemSlug) pushTo(itemSlug);
          if (!opts.targetSlug || opts.targetSlug === opts.collectionSlug) pushTo(opts.collectionSlug);
        } else {
          pushTo(opts.collectionSlug);
          if (opts.collectionSlug === 'owl-skin' && (!opts.targetSlug || opts.targetSlug === 'col:skins')) pushTo('col:skins');
          else if (opts.collectionSlug === 'col:skins' && (!opts.targetSlug || opts.targetSlug === 'owl-skin')) pushTo('owl-skin');
        }
      }

      cursor = typeof data?.response?.cursor === 'string' && data.response.cursor ? data.response.cursor : null;
      if (!cursor) {
        reachedEnd = true;
        break;
      }
      if (opts.targetSlug && (bySlug.get(opts.targetSlug)?.length ?? 0) >= MAX_SALES_PER_SLUG) {
        break;
      }
    }
  } catch {
    if (!anyOk) return null;
  }

  if (!anyOk) return null;
  for (const [k, list] of bySlug.entries()) {
    list.sort((a, b) => b.at - a.at);
    if (list.length > MAX_SALES_PER_SLUG) bySlug.set(k, list.slice(0, MAX_SALES_PER_SLUG));
  }
  return { bySlug, reachedEnd };
}

export function parseCachedEntry(raw: string | null | undefined, minAtMs: number): CachedSlugSales | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedSlugSales>;
    if (!parsed || !Array.isArray(parsed.sales)) return null;
    return {
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      complete30d: Boolean(parsed.complete30d),
      sales: parsed.sales.filter(s => s && Number.isFinite(s.at) && s.at >= minAtMs),
    };
  } catch {
    return null;
  }
}

export async function readAllSalesBundle(minAtMs: number): Promise<{
  updatedAt: number;
  bySlug: Record<string, MarketSale[]>;
  completeSlugs: string[];
  syncedCollections: string[];
  completeCollections: string[];
}> {
  const [rawHash, rawWm] = await Promise.all([
    redis<Record<string, string> | string[] | null>(['HGETALL', SALES_HASH_KEY]).catch(() => null),
    redis<string | null>(['GET', SALES_WATERMARK_KEY]).catch(() => null),
  ]);

  const bySlug: Record<string, MarketSale[]> = {};
  const completeSlugs: string[] = [];
  let latestUpdatedAt = 0;

  if (rawHash) {
    const entries: [string, string][] = Array.isArray(rawHash)
      ? Array.from({ length: Math.floor(rawHash.length / 2) }, (_, i) => [rawHash[i * 2], rawHash[i * 2 + 1]])
      : Object.entries(rawHash);

    for (const [slug, rawVal] of entries) {
      const parsed = parseCachedEntry(rawVal, minAtMs);
      if (!parsed) continue;
      if (parsed.updatedAt > latestUpdatedAt) latestUpdatedAt = parsed.updatedAt;
      if (parsed.sales.length > 0) bySlug[slug] = parsed.sales;
      if (parsed.complete30d) completeSlugs.push(slug);
    }
  }

  const syncedCollections = new Set<string>();
  const completeCollections = new Set<string>();
  const thirtyDaysAgoSec = Math.floor(minAtMs / 1000);
  if (rawWm) {
    try {
      const wms = JSON.parse(rawWm) as Record<string, CollectionWatermark>;
      if (wms && typeof wms === 'object') {
        for (const [addr, wm] of Object.entries(wms)) {
          const slug = wm?.collectionSlug || collectionSlugByRaw.get(toRawAddress(addr) || addr.toLowerCase());
          if (!slug) continue;
          if (wm?.latestSec > 0) {
            syncedCollections.add(slug);
            if (slug === 'owl-skin') syncedCollections.add('col:skins');
          }
          if (wm?.complete30d || (wm?.backfilledUntilSec > 0 && wm.backfilledUntilSec <= thirtyDaysAgoSec + 3600)) {
            completeCollections.add(slug);
            if (slug === 'owl-skin') completeCollections.add('col:skins');
          }
        }
      }
    } catch { /* ignore */ }
  }

  return {
    updatedAt: latestUpdatedAt,
    bySlug,
    completeSlugs,
    syncedCollections: [...syncedCollections],
    completeCollections: [...completeCollections],
  };
}

export async function isCollectionSynced30d(collectionAddress: string, minAtMs: number): Promise<{ synced: boolean; complete30d: boolean; fresh: boolean }> {
  const rawWm = await redis<string | null>(['GET', SALES_WATERMARK_KEY]).catch(() => null);
  if (!rawWm) return { synced: false, complete30d: false, fresh: false };
  try {
    const wms = JSON.parse(rawWm) as Record<string, CollectionWatermark>;
    const wm = wms?.[collectionAddress];
    if (!wm || !(wm.latestSec > 0)) return { synced: false, complete30d: false, fresh: false };
    const thirtyDaysAgoSec = Math.floor(minAtMs / 1000);
    const complete30d = Boolean(wm.complete30d || wm.backfilledUntilSec <= thirtyDaysAgoSec + 3600);
    const fresh = (Date.now() / 1000 - wm.latestSec) < (SALES_FRESH_MS / 1000);
    return { synced: true, complete30d, fresh };
  } catch {
    return { synced: false, complete30d: false, fresh: false };
  }
}

export async function upsertSlugSales(
  slug: string,
  incoming: MarketSale[],
  opts: { markComplete30d?: boolean; updatedAt?: number } = {},
): Promise<MarketSale[]> {
  const nowMs = opts.updatedAt ?? Date.now();
  const minAtMs = nowMs - SALES_RETENTION_MS;
  const raw = await redis<string | null>(['HGET', SALES_HASH_KEY, slug]).catch(() => null);
  const existing = parseCachedEntry(raw, minAtMs);
  const merged = mergeSales(incoming, existing?.sales ?? [], minAtMs);
  const payload: CachedSlugSales = {
    updatedAt: nowMs,
    complete30d: opts.markComplete30d ?? existing?.complete30d ?? false,
    sales: merged,
  };
  await redis(['HSET', SALES_HASH_KEY, slug, JSON.stringify(payload)]).catch(() => null);
  return merged;
}

const SYNC_COLLECTIONS: { address: string; collectionSlug: string; filterBySlug: boolean; priority: number }[] = [
  ...collections.map(col => ({
    address: col.address,
    collectionSlug: col.id === 'skins' ? 'owl-skin' : `col:${col.id}`,
    filterBySlug: col.id === 'items' || col.id === 'exp' || col.id === 'vouchers',
    priority: col.id === 'items' || col.id === 'skins' || col.id === 'genesis' || col.id === 'eggs' ? 1 : 2,
  })),
  ...stickers.collectionByAlbum.flatMap((address, idx) =>
    address ? [{ address, collectionSlug: `col:album-${idx}`, filterBySlug: false, priority: 3 }] : []),
];

/**
 * Background cron sync: keeps 30-day sales warm & pre-populated in Redis Hash `SALES_HASH_KEY`.
 * - Runs fast incremental head sync since `latestSec - 300`.
 * - Backfills older 30-day history incrementally using `backfilledUntilSec` watermarks.
 */
export async function syncMarketSales(opts: { timeBudgetMs?: number } = {}): Promise<{ syncedCols: number; updatedSlugs: number }> {
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const thirtyDaysAgoSec = nowSec - 30 * 86400;
  const minAtMs = nowMs - SALES_RETENTION_MS;
  const deadline = nowMs + (opts.timeBudgetMs ?? 24_000);

  const [rawHash, rawWm] = await Promise.all([
    redis<Record<string, string> | string[] | null>(['HGETALL', SALES_HASH_KEY]).catch(() => null),
    redis<string | null>(['GET', SALES_WATERMARK_KEY]).catch(() => null),
  ]);

  const existingBySlug = new Map<string, CachedSlugSales>();
  if (rawHash) {
    const entries: [string, string][] = Array.isArray(rawHash)
      ? Array.from({ length: Math.floor(rawHash.length / 2) }, (_, i) => [rawHash[i * 2], rawHash[i * 2 + 1]])
      : Object.entries(rawHash);
    for (const [slug, val] of entries) {
      const parsed = parseCachedEntry(val, minAtMs);
      if (parsed) existingBySlug.set(slug, parsed);
    }
  }

  let watermarks: Record<string, CollectionWatermark> = {};
  if (rawWm) {
    try {
      const parsed = JSON.parse(rawWm);
      if (parsed && typeof parsed === 'object') watermarks = parsed;
    } catch { /* ignore */ }
  }

  const dirtySlugs = new Set<string>();
  const touchSlug = (slug: string, incoming: MarketSale[], complete30d: boolean) => {
    const prev = existingBySlug.get(slug);
    const merged = mergeSales(incoming, prev?.sales ?? [], minAtMs);
    existingBySlug.set(slug, {
      updatedAt: nowMs,
      complete30d: complete30d || Boolean(prev?.complete30d),
      sales: merged,
    });
    dirtySlugs.add(slug);
  };

  let syncedCols = 0;
  const hasGetgems = Boolean(process.env.GETGEMS_READ_TOKEN);
  const hasToncenterKey = Boolean(process.env.TONCENTER_API_KEY || process.env.TONCENTER_TOKEN);

  // Prioritize never-synced or stale collections (>30 min) so priority 2/3 never starve behind items backfill
  const ordered = [...SYNC_COLLECTIONS].sort((a, b) => {
    const aLatest = watermarks[a.address]?.latestSec ?? 0;
    const bLatest = watermarks[b.address]?.latestSec ?? 0;
    const aNever = aLatest === 0;
    const bNever = bLatest === 0;
    if (aNever !== bNever) return aNever ? -1 : 1;
    const aStale = nowSec - aLatest > 1800;
    const bStale = nowSec - bLatest > 1800;
    if (aStale !== bStale) return aStale ? -1 : 1;
    const aBackfilled = (watermarks[a.address]?.backfilledUntilSec ?? nowSec) <= thirtyDaysAgoSec + 3600;
    const bBackfilled = (watermarks[b.address]?.backfilledUntilSec ?? nowSec) <= thirtyDaysAgoSec + 3600;
    if (aBackfilled !== bBackfilled) return aBackfilled ? 1 : -1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return aLatest - bLatest;
  });

  const hasUnsynced = SYNC_COLLECTIONS.some(c => !(watermarks[c.address]?.latestSec > 0));

  for (const col of ordered) {
    const remaining = deadline - Date.now();
    if (remaining < 1800) break;

    const wm = watermarks[col.address] ?? { latestSec: 0, backfilledUntilSec: nowSec };
    const headSince = wm.latestSec > thirtyDaysAgoSec ? Math.max(thirtyDaysAgoSec, wm.latestSec - 300) : thirtyDaysAgoSec;

    // 1) Try Getgems public API first when available (much denser for sold events)
    if (hasGetgems) {
      const gg = await scanGetgemsCollectionSales({
        collectionAddress: col.address,
        collectionSlug: col.collectionSlug,
        filterBySlug: col.filterBySlug,
        minMs: headSince * 1000,
        maxMs: nowMs,
        maxPages: col.filterBySlug ? 12 : 4,
        timeBudgetMs: Math.min(6000, remaining - 400),
      });
      if (gg) {
        const isComplete = gg.reachedEnd && headSince <= thirtyDaysAgoSec + 60;
        for (const [slug, list] of gg.bySlug.entries()) touchSlug(slug, list, isComplete);
        touchSlug(col.collectionSlug, gg.bySlug.get(col.collectionSlug) ?? [], isComplete);
        if (col.collectionSlug === 'owl-skin') touchSlug('col:skins', gg.bySlug.get('col:skins') ?? [], isComplete);
        const nextBackfill = isComplete ? thirtyDaysAgoSec : wm.backfilledUntilSec;
        watermarks[col.address] = {
          latestSec: nowSec,
          backfilledUntilSec: nextBackfill,
          collectionSlug: col.collectionSlug,
          complete30d: nextBackfill <= thirtyDaysAgoSec + 3600,
        };
        syncedCols += 1;
        continue;
      }
    }

    // 2) TON Center head sync
    const headCap = hasUnsynced && col.collectionSlug === 'col:items' ? 4500 : (col.priority === 1 ? 6500 : 3200);
    const headBudget = Math.min(headCap, remaining - 300);
    const headRes = await scanToncenterCollectionSales({
      collectionAddress: col.address,
      collectionSlug: col.collectionSlug,
      filterBySlug: col.filterBySlug,
      sinceSec: headSince,
      maxPages: wm.latestSec > thirtyDaysAgoSec ? 2 : (hasToncenterKey ? 4 : 2),
      timeBudgetMs: headBudget,
    });

    const headSucceeded = headRes.reachedEnd || headRes.newestUtime !== null;
    const headCoveredAll30d = headRes.reachedEnd && headSince <= thirtyDaysAgoSec + 60;
    if (headSucceeded) {
      for (const [slug, list] of headRes.bySlug.entries()) touchSlug(slug, list, headCoveredAll30d);
      touchSlug(col.collectionSlug, headRes.bySlug.get(col.collectionSlug) ?? [], headCoveredAll30d);
      if (col.collectionSlug === 'owl-skin') touchSlug('col:skins', headRes.bySlug.get('col:skins') ?? [], headCoveredAll30d);
    }

    let nextBackfillUntil = headCoveredAll30d
      ? thirtyDaysAgoSec
      : Math.min(wm.backfilledUntilSec, headRes.oldestUtime ?? wm.backfilledUntilSec);

    // 3) Continue historical 30d backfill if needed & budget permits (skip heavy backfill while other collections have never synced)
    const remAfterHead = deadline - Date.now();
    const skipHeavyBackfill = hasUnsynced && col.collectionSlug === 'col:items' && (wm.latestSec > 0 || headSucceeded);
    if (!skipHeavyBackfill && nextBackfillUntil > thirtyDaysAgoSec + 3600 && remAfterHead > 2500) {
      const bfRes = await scanToncenterCollectionSales({
        collectionAddress: col.address,
        collectionSlug: col.collectionSlug,
        filterBySlug: col.filterBySlug,
        sinceSec: thirtyDaysAgoSec,
        untilSec: nextBackfillUntil + 60,
        maxPages: hasToncenterKey ? 4 : 2,
        timeBudgetMs: Math.min(5500, remAfterHead - 400),
      });
      const bfSucceeded = bfRes.reachedEnd || bfRes.newestUtime !== null;
      const bfComplete = bfRes.reachedEnd;
      if (bfSucceeded) {
        for (const [slug, list] of bfRes.bySlug.entries()) touchSlug(slug, list, bfComplete);
        touchSlug(col.collectionSlug, bfRes.bySlug.get(col.collectionSlug) ?? [], bfComplete);
        if (col.collectionSlug === 'owl-skin') touchSlug('col:skins', bfRes.bySlug.get('col:skins') ?? [], bfComplete);
      }

      if (bfComplete) nextBackfillUntil = thirtyDaysAgoSec;
      else if (bfRes.oldestUtime !== null && bfRes.oldestUtime < nextBackfillUntil) {
        nextBackfillUntil = bfRes.oldestUtime;
      }
    }

    if (headSucceeded || nextBackfillUntil < wm.backfilledUntilSec) {
      watermarks[col.address] = {
        latestSec: headRes.newestUtime ? Math.max(wm.latestSec, headRes.newestUtime) : (headRes.reachedEnd ? Math.max(wm.latestSec, nowSec) : wm.latestSec),
        backfilledUntilSec: nextBackfillUntil,
        collectionSlug: col.collectionSlug,
        complete30d: nextBackfillUntil <= thirtyDaysAgoSec + 3600,
      };
      syncedCols += 1;
    }
  }

  // Persist dirty slugs to Redis Hash in compact batches
  const dirtyEntries = [...dirtySlugs];
  for (let i = 0; i < dirtyEntries.length; i += 10) {
    const chunk = dirtyEntries.slice(i, i + 10);
    const args: (string | number)[] = ['HSET', SALES_HASH_KEY];
    for (const slug of chunk) {
      const val = existingBySlug.get(slug);
      if (val) args.push(slug, JSON.stringify(val));
    }
    if (args.length > 2) await redis(args).catch(() => null);
  }
  await redis(['PERSIST', SALES_HASH_KEY]).catch(() => null);
  await redis(['SET', SALES_WATERMARK_KEY, JSON.stringify(watermarks), 'EX', 30 * 86400]).catch(() => null);

  return { syncedCols, updatedSlugs: dirtySlugs.size };
}
