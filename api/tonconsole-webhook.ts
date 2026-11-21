import { getgemsNftUrl } from '../src/domain/ton-address.js';
import {
  collectionSlugByRaw,
  inferSaleImage,
  normalizeCurrency,
  resolveItemSlug,
  toRawAddress,
  upsertSlugSales,
  type MarketSale,
} from '../server/market-sales.js';
import { redis } from '../server/redis.js';

export const config = { runtime: 'edge' };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || !a.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
      const rawImg = p.nft.metadata?.image;
      const itemSlug = resolveItemSlug(rawImg, name, p.nft.content_uri);
      const amount = p.amount;
      const decimals = typeof amount?.decimals === 'number' ? amount.decimals : 9;
      const val = Number(amount?.value ?? 0) / 10 ** decimals;
      if (!Number.isFinite(val) || val <= 0) continue;
      const currency = amount?.currency_type === 'native'
        ? 'GRAM'
        : normalizeCurrency(amount?.token_name || 'TON');
      const addr = String(p.nft.address ?? '');
      const image = inferSaleImage(itemSlug ?? colSlug ?? '', name, rawImg);
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
        await upsertSlugSales(colSlug, [sale]);
        await redis(['DEL', `notwise:market:lots:v1:${colSlug}`]).catch(() => null);
        if (colSlug === 'owl-skin') {
          await upsertSlugSales('col:skins', [sale]);
          await redis(['DEL', 'notwise:market:lots:v1:col:skins']).catch(() => null);
        }
      }
      if (itemSlug && itemSlug !== colSlug) {
        await upsertSlugSales(itemSlug, [sale]);
        await redis(['DEL', `notwise:market:lots:v1:${itemSlug}`]).catch(() => null);
      }
      processed += 1;
    }
  }

  return Response.json({ ok: true, processed });
}
