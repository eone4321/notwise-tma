import { getgemsNftUrl } from '../../src/domain/ton-address';
import collections from '../../src/features/market-collections';
import stickers from '../../src/features/sticker-data';
import { redis } from '../../server/redis';

export const config = { runtime: 'edge' };

const getgemsApi = 'https://api.getgems.io/public-api/v1';

export type MarketSale = {
  address: string;
  name: string;
  price: number;
  currency: string;
  at: number;
  image?: string;
  href: string;
};

function resolveCollection(slug: string): { address: string; filterBySlug: boolean } | null {
  if (slug === 'owl-skin') {
    const col = collections.find(c => c.id === 'skins');
    return col ? { address: col.address, filterBySlug: false } : null;
  }
  if (slug.startsWith('col:album-')) {
    const id = Number(slug.slice('col:album-'.length));
    const addr = stickers.collectionByAlbum[id];
    return addr ? { address: addr, filterBySlug: false } : null;
  }
  if (slug.startsWith('col:')) {
    const id = slug.slice(4);
    const col = collections.find(c => c.id === id);
    return col ? { address: col.address, filterBySlug: false } : null;
  }
  if (slug.startsWith('floppy-')) {
    const col = collections.find(c => c.id === 'exp');
    if (col) return { address: col.address, filterBySlug: true };
  }
  if (slug.startsWith('voucher-')) {
    const col = collections.find(c => c.id === 'vouchers');
    if (col) return { address: col.address, filterBySlug: true };
  }
  const items = collections.find(c => c.id === 'items');
  return items ? { address: items.address, filterBySlug: true } : null;
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

function inferImage(slug: string, name: string, rawImage: unknown): string | undefined {
  if (typeof rawImage === 'string' && /^https:\/\/[\w.-]+\//i.test(rawImage)) return rawImage;
  if (slug === 'owl-skin') {
    const match = /#(\d{1,6})/.exec(name);
    if (match?.[1]) return `https://cdn.notwise.co/nft/skins/svg/${match[1]}.svg`;
  }
  return undefined;
}

async function fetchOnChainSales(collectionAddress: string, slug: string, filterBySlug: boolean): Promise<MarketSale[]> {
  const toncenterToken = process.env.TONCENTER_API_KEY || process.env.TONCENTER_TOKEN;
  const headers: HeadersInit = toncenterToken ? { 'X-API-Key': toncenterToken } : {};
  const sinceSec = Math.floor(Date.now() / 1000) - 30 * 86400;

  const seenTraces = new Set<string>();
  const traceIds: string[] = [];
  const maxPages = filterBySlug ? 10 : 1;
  const maxTraces = filterBySlug ? 360 : 60;

  for (let page = 0; page < maxPages; page += 2) {
    if (page > 0) await new Promise(resolve => setTimeout(resolve, 220));
    const batchPages = filterBySlug ? [page, page + 1].filter(p => p < maxPages) : [0];
    const results = await Promise.all(
      batchPages.map(async p => {
        try {
          const trRes = await fetch(
            `https://toncenter.com/api/v3/nft/transfers?collection_address=${encodeURIComponent(collectionAddress)}&start_utime=${sinceSec}&limit=100&offset=${p * 100}&sort=desc`,
            { headers, signal: AbortSignal.timeout(5000) },
          );
          if (!trRes.ok) return [];
          const trData = await trRes.json();
          return Array.isArray(trData?.nft_transfers) ? trData.nft_transfers : [];
        } catch {
          return [];
        }
      }),
    );
    let done = false;
    for (const transfers of results) {
      for (const t of transfers) {
        if (!t?.old_owner) continue;
        if (typeof t?.trace_id === 'string' && !seenTraces.has(t.trace_id)) {
          seenTraces.add(t.trace_id);
          traceIds.push(t.trace_id);
          if (traceIds.length >= maxTraces) { done = true; break; }
        }
      }
      if (transfers.length < 100) done = true;
      if (done) break;
    }
    if (done) break;
  }
  if (traceIds.length === 0) return [];

  const sales: MarketSale[] = [];
  const bySlug = new Map<string, MarketSale[]>();
  const seenSaleKeys = new Set<string>();

  // Query TON Center v3 actions in chunks of 20 traces, 2 chunks at a time (<= 9 req/sec)
  const chunks: string[][] = [];
  for (let i = 0; i < traceIds.length; i += 20) {
    chunks.push(traceIds.slice(i, i + 20));
  }

  for (let i = 0; i < chunks.length; i += 2) {
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 230));
    const pair = chunks.slice(i, i + 2);
    const actResponses: any[] = await Promise.all(
      pair.map(async (chunk): Promise<any> => {
        const params = new URLSearchParams();
        for (const tid of chunk) params.append('trace_id', tid);
        params.set('limit', '100');
        try {
          const actRes = await fetch(`https://toncenter.com/api/v3/actions?${params.toString()}`, {
            headers,
            signal: AbortSignal.timeout(5000),
          });
          return actRes.ok ? await actRes.json() : null;
        } catch {
          return null;
        }
      }),
    );

    for (const actData of actResponses) {
      if (!actData) continue;
      const actions = Array.isArray(actData?.actions) ? actData.actions : [];
      const metadata = actData?.metadata && typeof actData.metadata === 'object' ? actData.metadata : {};

      for (const act of actions) {
        if (act?.type !== 'nft_purchase' || act?.success === false) continue;
        const tid = typeof act.trace_id === 'string' ? act.trace_id : '';
        const det = act.details;
        const addr = String(det?.nft_item ?? '');
        const price = Number(det?.price ?? 0) / 1e9;
        if (!addr || !Number.isFinite(price) || price <= 0) continue;
        const tokenInfo = metadata?.[addr]?.token_info?.[0];
        const name = typeof tokenInfo?.name === 'string' && tokenInfo.name.trim() ? tokenInfo.name.trim() : slug;
        const mappedSlug = filterBySlug ? nameToSlug(name) : slug;
        const key = `${tid}:${addr}`;
        if (seenSaleKeys.has(key)) continue;
        seenSaleKeys.add(key);
        const utime = Number(act.end_utime ?? act.start_utime ?? 0);
        const sale: MarketSale = {
          address: addr,
          name,
          price,
          currency: 'GRAM',
          at: utime * 1000,
          image: inferImage(mappedSlug ?? slug, name, tokenInfo?.image),
          href: getgemsNftUrl(addr) || `https://getgems.io/collection/${collectionAddress}`,
        };

        if (filterBySlug && mappedSlug) {
          const arr = bySlug.get(mappedSlug);
          if (arr) arr.push(sale);
          else bySlug.set(mappedSlug, [sale]);
        }
        if (!filterBySlug || mappedSlug === slug) {
          sales.push(sale);
        }
      }
    }

    if (!filterBySlug && sales.length >= 24) break;
  }

  // Warm Redis cache for sibling items discovered in the same collection scan
  if (filterBySlug && bySlug.size > 0) {
    const writes: Promise<unknown>[] = [];
    for (const [siblingSlug, list] of bySlug.entries()) {
      if (siblingSlug === slug || list.length === 0) continue;
      const sorted = list.sort((a, b) => b.at - a.at).slice(0, 24);
      writes.push(redis(['SET', `notwise:market:sales:v5:${siblingSlug}`, JSON.stringify(sorted), 'EX', 7 * 86400]).catch(() => null));
    }
    await Promise.all(writes);
  }

  return sales.sort((a, b) => b.at - a.at).slice(0, 24);
}

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase();
  if (!/^[a-z0-9:-]{1,48}$/.test(slug)) {
    return Response.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const cacheKey = `notwise:market:sales:v5:${slug}`;
  const minAtMs = Date.now() - 30 * 86400_000;
  const cached = await redis<string | null>(['GET', cacheKey]).catch(() => null);
  if (cached) {
    try {
      const rawParsed = JSON.parse(cached);
      if (Array.isArray(rawParsed)) {
        const parsed = (rawParsed as MarketSale[]).filter(s => s.at >= minAtMs);
        return Response.json({ slug, sales: parsed }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } });
      }
    } catch { /* ignore */ }
  }

  const target = resolveCollection(slug);
  if (!target) {
    return Response.json({ slug, sales: [] }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } });
  }

  const token = process.env.GETGEMS_READ_TOKEN;
  const sales: MarketSale[] = [];

  if (token) {
    try {
      let cursor: string | null = null;
      const maxPages = target.filterBySlug ? 4 : 1;
      const nowMs = Date.now();
      const minMs = nowMs - 30 * 86400_000;

      for (let page = 0; page < maxPages; page++) {
        const apiUrl = new URL(`${getgemsApi}/collection/history/${target.address}`);
        apiUrl.searchParams.set('minTime', String(minMs));
        apiUrl.searchParams.set('maxTime', String(nowMs));
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

        for (const row of items) {
          if (row?.typeData?.type !== 'sold') continue;
          const price = Number(row.typeData.price);
          if (!Number.isFinite(price) || price <= 0) continue;
          const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : slug;
          if (target.filterBySlug && nameToSlug(name) !== slug) continue;
          const at = Date.parse(row.time);
          if (!Number.isFinite(at) || at <= 0) continue;
          const currency = !row.typeData.currency || row.typeData.currency === 'TON' ? 'GRAM' : String(row.typeData.currency);
          sales.push({
            address: String(row.address ?? ''),
            name,
            price,
            currency,
            at,
            image: inferImage(slug, name, row.image),
            href: typeof row.address === 'string' && row.address ? getgemsNftUrl(row.address) : `https://getgems.io/collection/${target.address}`,
          });
          if (sales.length >= 24) break;
        }

        if (sales.length >= 24) break;
        cursor = typeof data?.response?.cursor === 'string' && data.response.cursor ? data.response.cursor : null;
        if (!cursor) break;
      }
    } catch { /* fall through to on-chain fallback */ }
  }

  if (sales.length === 0) {
    const onChain = await fetchOnChainSales(target.address, slug, target.filterBySlug).catch(() => []);
    sales.push(...onChain);
  }

  sales.sort((a, b) => b.at - a.at);
  const finalSales = sales.filter(s => s.at >= minAtMs).slice(0, 24);
  const ttlSec = finalSales.length > 0 ? 7 * 86400 : 86400;
  await redis(['SET', cacheKey, JSON.stringify(finalSales), 'EX', ttlSec]).catch(() => null);
  return Response.json(
    { slug, sales: finalSales },
    { headers: { 'Cache-Control': finalSales.length > 0 ? 'public, max-age=0, s-maxage=60' : 'no-store' } },
  );
}
