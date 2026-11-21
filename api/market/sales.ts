import { getgemsNftUrl } from '../../src/domain/ton-address';
import collections from '../../src/features/market-collections';
import stickers from '../../src/features/sticker-data';

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

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase();
  if (!/^[a-z0-9:-]{1,48}$/.test(slug)) {
    return Response.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const target = resolveCollection(slug);
  if (!target) {
    return Response.json({ slug, sales: [] }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } });
  }

  const token = process.env.GETGEMS_READ_TOKEN;
  if (!token) {
    return Response.json({ slug, sales: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const sales: MarketSale[] = [];
    let cursor: string | null = null;
    const maxPages = target.filterBySlug ? 4 : 1;

    for (let page = 0; page < maxPages; page++) {
      const apiUrl = new URL(`${getgemsApi}/collection/history/${target.address}`);
      apiUrl.searchParams.set('limit', '60');
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
        if (target.filterBySlug && nameToSlug(row.name) !== slug) continue;
        const at = Date.parse(row.time);
        if (!Number.isFinite(at) || at <= 0) continue;
        const currency = !row.typeData.currency || row.typeData.currency === 'TON' ? 'GRAM' : String(row.typeData.currency);
        const safeImage = typeof row.image === 'string' && /^https:\/\/[\w.-]+\//i.test(row.image) ? row.image : undefined;
        sales.push({
          address: String(row.address ?? ''),
          name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : slug,
          price,
          currency,
          at,
          ...(safeImage ? { image: safeImage } : {}),
          href: typeof row.address === 'string' && row.address ? getgemsNftUrl(row.address) : `https://getgems.io/collection/${target.address}`,
        });
        if (sales.length >= 24) break;
      }

      if (sales.length >= 24) break;
      cursor = typeof data?.response?.cursor === 'string' && data.response.cursor ? data.response.cursor : null;
      if (!cursor) break;
    }

    sales.sort((a, b) => b.at - a.at);
    return Response.json(
      { slug, sales: sales.slice(0, 24) },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } },
    );
  } catch {
    return Response.json({ slug, sales: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
