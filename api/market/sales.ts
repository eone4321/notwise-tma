import {
  MAX_SALES_PER_SLUG,
  SALES_FRESH_MS,
  SALES_HASH_KEY,
  SALES_RETENTION_MS,
  isCollectionSynced30d,
  mergeSales,
  parseCachedEntry,
  readAllSalesBundle,
  resolveCollectionTarget,
  scanGetgemsCollectionSales,
  scanToncenterCollectionSales,
  type CachedSlugSales,
  type MarketSale,
} from '../../server/market-sales.js';
import { redis } from '../../server/redis.js';

export const config = { runtime: 'edge' };

export type { MarketSale };

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const url = new URL(request.url);
  const nowMs = Date.now();
  const minAtMs = nowMs - SALES_RETENTION_MS;

  if (url.searchParams.get('all') === '1') {
    const bundle = await readAllSalesBundle(minAtMs);
    return Response.json(bundle, {
      headers: {
        'Cache-Control': Object.keys(bundle.bySlug).length > 0 ? 'public, max-age=0, s-maxage=60' : 'no-store',
      },
    });
  }

  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase();
  if (!/^[a-z0-9:-]{1,48}$/.test(slug)) {
    return Response.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const rawCached = await redis<string | null>(['HGET', SALES_HASH_KEY, slug]).catch(() => null);
  const cached = parseCachedEntry(rawCached, minAtMs);

  if (cached && cached.complete30d && cached.updatedAt > 0 && nowMs - cached.updatedAt < SALES_FRESH_MS) {
    return Response.json(
      { slug, sales: cached.sales },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } },
    );
  }

  const target = resolveCollectionTarget(slug);
  if (!target) {
    return Response.json({ slug, sales: [] }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } });
  }

  // If the parent collection is already synced over 30d and fresh, an uncached slug simply has 0 sales
  if (!cached) {
    const colState = await isCollectionSynced30d(target.address, minAtMs);
    if (colState.complete30d && colState.fresh) {
      return Response.json(
        { slug, sales: [] },
        { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } },
      );
    }
  }

  const thirtyDaysAgoSec = Math.floor(minAtMs / 1000);
  const isDelta = Boolean(cached && cached.complete30d && cached.updatedAt > 0);
  const sinceSec = isDelta
    ? Math.max(thirtyDaysAgoSec, Math.floor(cached!.updatedAt / 1000) - 300)
    : thirtyDaysAgoSec;

  let incoming: MarketSale[] = [];
  let reachedEnd = false;
  let scanned = false;

  const gg = await scanGetgemsCollectionSales({
    collectionAddress: target.address,
    collectionSlug: target.collectionSlug,
    filterBySlug: target.filterBySlug,
    targetSlug: slug,
    minMs: sinceSec * 1000,
    maxMs: nowMs,
    maxPages: isDelta ? 3 : target.filterBySlug ? 12 : 4,
    timeBudgetMs: isDelta ? 3500 : 5000,
  });

  if (gg) {
    scanned = true;
    reachedEnd = gg.reachedEnd;
    incoming = gg.bySlug.get(slug) ?? [];
  }

  if (!scanned || (!isDelta && incoming.length === 0 && !reachedEnd)) {
    const tc = await scanToncenterCollectionSales({
      collectionAddress: target.address,
      collectionSlug: target.collectionSlug,
      filterBySlug: target.filterBySlug,
      targetSlug: slug,
      sinceSec,
      maxPages: isDelta ? 2 : target.filterBySlug ? 10 : 4,
      timeBudgetMs: isDelta ? 3500 : 6000,
    });
    scanned = true;
    reachedEnd = reachedEnd || tc.reachedEnd;
    const tcList = tc.bySlug.get(slug) ?? [];
    if (tcList.length > 0) {
      incoming = mergeSales(incoming, tcList, minAtMs);
    }
  }

  const merged = mergeSales(incoming, cached?.sales ?? [], minAtMs);
  const complete30d = Boolean(
    cached?.complete30d
    || (sinceSec <= thirtyDaysAgoSec + 60 && (reachedEnd || merged.length >= MAX_SALES_PER_SLUG)),
  );

  const payload: CachedSlugSales = {
    updatedAt: nowMs,
    complete30d,
    sales: merged,
  };
  await redis(['HSET', SALES_HASH_KEY, slug, JSON.stringify(payload)]).catch(() => null);
  await redis(['PERSIST', SALES_HASH_KEY]).catch(() => null);

  return Response.json(
    { slug, sales: merged },
    { headers: { 'Cache-Control': merged.length > 0 ? 'public, max-age=0, s-maxage=60' : 'no-store' } },
  );
}
