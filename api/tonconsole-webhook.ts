import { getgemsNftUrl } from '../src/domain/ton-address';
import collections from '../src/features/market-collections';
import stickers from '../src/features/sticker-data';
import { redis } from '../server/redis';

export const config = { runtime: 'edge' };

type MarketSale = {
  address: string;
  name: string;
  price: number;
  currency: string;
  at: number;
  image?: string;
  href: string;
};

const friendlyRe = /^[A-Za-z0-9_-]{48}$/;
const rawRe = /^0:[0-9a-f]{64}$/i;

function toRawAddress(addr: string): string {
  if (rawRe.test(addr)) return addr.toLowerCase();
  if (!friendlyRe.test(addr)) return '';
  try {
    const bytes = atob(addr.replaceAll('-', '+').replaceAll('_', '/')).slice(2, 34);
    return '0:' + Array.from(bytes, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

const collectionSlugByRaw = new Map<string, string>();
for (const col of collections) {
  const raw = toRawAddress(col.address);
  if (raw) collectionSlugByRaw.set(raw, col.id === 'skins' ? 'owl-skin' : `col:${col.id}`);
}
stickers.collectionByAlbum.forEach((addr, idx) => {
  if (!addr) return;
  const raw = toRawAddress(addr);
  if (raw) collectionSlugByRaw.set(raw, `col:album-${idx}`);
});

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || !a.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function prependSale(slug: string, sale: MarketSale) {
  const key = `notwise:market:sales:v3:${slug}`;
  const raw = await redis<string | null>(['GET', key]).catch(() => null);
  let list: MarketSale[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch { /* ignore */ }
  }
  if (list.some(s => s.address === sale.address && Math.abs(s.at - sale.at) < 2000)) return;
  list.unshift(sale);
  list.sort((a, b) => b.at - a.at);
  await redis(['SET', key, JSON.stringify(list.slice(0, 24)), 'EX', 86400]).catch(() => null);
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const secret = process.env.TONCONSOLE_WEBHOOK_SECRET;
  if (!secret || secret.length < 16) return Response.json({ error: 'unavailable' }, { status: 503 });

  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret') ?? '';
  const bearer = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const provided = querySecret || bearer;
  if (!timingSafeEqual(provided, secret)) return Response.json({ error: 'forbidden' }, { status: 403 });

  let payload: { tx_hash?: string; account_id?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const txHash = typeof payload?.tx_hash === 'string' ? payload.tx_hash.trim() : '';
  if (!/^[a-f0-9]{64}$/i.test(txHash)) return Response.json({ ok: true, ignored: true });

  const tonapiToken = process.env.TONAPI_TOKEN;
  const evRes = await fetch(`https://tonapi.io/v2/events/${txHash}`, {
    headers: tonapiToken ? { Authorization: `Bearer ${tonapiToken}` } : {},
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!evRes?.ok) return Response.json({ ok: false }, { status: 502 });

  const ev = await evRes.json();
  if (ev?.in_progress || !Array.isArray(ev?.actions)) return Response.json({ ok: true, processed: 0 });

  let processed = 0;
  for (const act of ev.actions) {
    if (act?.type === 'NftPurchase' && act?.status === 'ok' && act?.NftPurchase?.nft) {
      const p = act.NftPurchase;
      const colRaw = toRawAddress(p.nft.collection?.address ?? '');
      const colSlug = collectionSlugByRaw.get(colRaw);
      const name = typeof p.nft.metadata?.name === 'string' && p.nft.metadata.name.trim()
        ? p.nft.metadata.name.trim()
        : (colSlug ?? 'NOT Wise NFT');
      const itemSlug = nameToSlug(name);
      const amount = p.amount;
      const decimals = typeof amount?.decimals === 'number' ? amount.decimals : 9;
      const val = Number(amount?.value ?? 0) / 10 ** decimals;
      if (!Number.isFinite(val) || val <= 0) continue;
      const currency = amount?.currency_type === 'native' ? 'GRAM' : String(amount?.token_name || 'TON');
      const addr = String(p.nft.address ?? '');
      const rawImg = p.nft.metadata?.image;
      let image = typeof rawImg === 'string' && /^https:\/\/[\w.-]+\//i.test(rawImg) ? rawImg : undefined;
      if (!image && (colSlug === 'owl-skin' || itemSlug === 'owl-skin')) {
        const m = /#(\d{1,6})/.exec(name);
        if (m?.[1]) image = `https://cdn.notwise.co/nft/skins/svg/${m[1]}.svg`;
      }
      const sale: MarketSale = {
        address: addr,
        name,
        price: val,
        currency,
        at: Number(ev.timestamp) * 1000,
        ...(image ? { image } : {}),
        href: addr ? getgemsNftUrl(addr) : 'https://getgems.io',
      };
      if (colSlug) {
        await prependSale(colSlug, sale);
        await redis(['DEL', `notwise:market:lots:v1:${colSlug}`]).catch(() => null);
      }
      if (itemSlug && itemSlug !== colSlug) {
        await prependSale(itemSlug, sale);
        await redis(['DEL', `notwise:market:lots:v1:${itemSlug}`]).catch(() => null);
      }
      processed += 1;
    }
  }

  return Response.json({ ok: true, processed });
}
