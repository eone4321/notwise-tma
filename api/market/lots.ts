import { getgemsNftUrl } from '../../src/domain/ton-address';
import collections from '../../src/features/market-collections';
import stickers from '../../src/features/sticker-data';
import { redis } from '../../server/redis';

export const config = { runtime: 'edge' };

const getgemsApi = 'https://api.getgems.io/public-api/v1';

export type OnDemandLot = {
  address: string;
  name: string;
  price: number;
  enchant: number;
  href: string;
  image?: string;
};

function parseEnchant(name: unknown): number {
  if (typeof name !== 'string') return 0;
  const match = /\+(\d{1,2})\s*$/.exec(name.trim());
  if (!match) return 0;
  const level = Number(match[1]);
  return Number.isSafeInteger(level) && level >= 0 && level <= 20 ? level : 0;
}

function resolveCollection(slug: string): string | null {
  if (slug === 'owl-skin') return collections.find(c => c.id === 'skins')?.address ?? null;
  if (slug.startsWith('col:album-')) {
    const id = Number(slug.slice('col:album-'.length));
    return stickers.collectionByAlbum[id] ?? null;
  }
  if (slug.startsWith('col:')) {
    const id = slug.slice(4);
    return collections.find(c => c.id === id)?.address ?? null;
  }
  if (slug.startsWith('floppy-')) return collections.find(c => c.id === 'exp')?.address ?? null;
  if (slug.startsWith('voucher-')) return collections.find(c => c.id === 'vouchers')?.address ?? null;
  return collections.find(c => c.id === 'items')?.address ?? null;
}

function inferImage(slug: string, name: string, rawImage: unknown): string | undefined {
  if (typeof rawImage === 'string' && /^https:\/\/[\w.-]+\//i.test(rawImage)) return rawImage;
  if (slug === 'owl-skin') {
    const match = /#(\d{1,6})/.exec(name);
    if (match?.[1]) return `https://cdn.notwise.co/nft/skins/svg/${match[1]}.svg`;
  }
  return undefined;
}

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase();
  if (!/^[a-z0-9:-]{1,48}$/.test(slug)) {
    return Response.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const cacheKey = `notwise:market:lots:v1:${slug}`;
  const cached = await redis<string | null>(['GET', cacheKey]).catch(() => null);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as OnDemandLot[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Response.json({ slug, lots: parsed }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } });
      }
    } catch { /* ignore */ }
  }

  const collectionAddress = resolveCollection(slug);
  if (!collectionAddress) {
    return Response.json({ slug, lots: [] }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } });
  }

  const token = process.env.GETGEMS_READ_TOKEN;
  const lots: OnDemandLot[] = [];

  if (token) {
    try {
      let cursor: string | null = null;
      for (let page = 0; page < 3; page++) {
        const apiUrl = new URL(`${getgemsApi}/nfts/on-sale/${collectionAddress}`);
        apiUrl.searchParams.set('limit', '100');
        if (cursor) apiUrl.searchParams.set('after', cursor);
        const res = await fetch(apiUrl, { headers: { Authorization: token }, signal: AbortSignal.timeout(5000) });
        if (!res.ok) break;
        const result = (await res.json())?.response;
        if (!Array.isArray(result?.items)) break;
        for (const row of result.items) {
          if (row?.sale?.type !== 'FixPriceSale' || !['TON', 'GRAM'].includes(row.sale.currency)) continue;
          const price = Number(row.sale.fullPrice) / 1e9;
          if (!Number.isFinite(price) || price <= 0) continue;
          const addr = String(row.address ?? '');
          if (!addr) continue;
          const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : slug;
          lots.push({
            address: addr,
            name,
            price,
            enchant: parseEnchant(name),
            href: getgemsNftUrl(addr),
            image: inferImage(slug, name, row.image),
          });
        }
        cursor = typeof result.cursor === 'string' && result.cursor ? result.cursor : null;
        if (!cursor || lots.length >= 60) break;
      }
    } catch { /* fallback below */ }
  }

  if (lots.length === 0) {
    const tonapiToken = process.env.TONAPI_TOKEN;
    try {
      const res = await fetch(
        `https://tonapi.io/v2/nfts/collections/${encodeURIComponent(collectionAddress)}/items?limit=100&offset=0`,
        {
          headers: tonapiToken ? { Authorization: `Bearer ${tonapiToken}` } : {},
          signal: AbortSignal.timeout(5000),
        },
      );
      if (res.ok) {
        const data = await res.json();
        for (const row of data?.nft_items ?? []) {
          const s = row?.sale;
          if (!s?.price?.value || !s?.price?.decimals) continue;
          const price = Number(s.price.value) / 10 ** Number(s.price.decimals);
          if (!Number.isFinite(price) || price <= 0) continue;
          const addr = String(row.address ?? '');
          if (!addr) continue;
          const name = typeof row.metadata?.name === 'string' && row.metadata.name.trim() ? row.metadata.name.trim() : slug;
          lots.push({
            address: addr,
            name,
            price,
            enchant: parseEnchant(name),
            href: getgemsNftUrl(addr),
            image: inferImage(slug, name, row.metadata?.image),
          });
        }
      }
    } catch { /* ignore */ }
  }

  lots.sort((a, b) => a.price - b.price);
  const top = lots.slice(0, 48);
  if (top.length > 0) {
    await redis(['SET', cacheKey, JSON.stringify(top), 'EX', 120]).catch(() => null);
  }
  return Response.json(
    { slug, lots: top },
    { headers: { 'Cache-Control': top.length > 0 ? 'public, max-age=0, s-maxage=60' : 'no-store' } },
  );
}
