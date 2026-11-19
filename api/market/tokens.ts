import tokens from '../../public/data/tokens.json';
import { tonRates } from '../../server/ton-rates';

export const config = { runtime: 'edge' };

async function json<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4200) });
    return response.ok ? await response.json() as T : null;
  } catch {
    return null;
  }
}

const positive = (input: unknown) => {
  const value = typeof input === 'number' || typeof input === 'string' ? Number(input) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
};

export default async function handler() {
  const jettons = tokens.tokens.flatMap(token => token.master_address ? [token.master_address] : []);
  const [rates, native, market] = await Promise.all([
    tonRates(['ton', ...jettons]).catch(() => null),
    json<Record<string, {usd_market_cap?: number}>>(
      'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,notcoin&vs_currencies=usd&include_market_cap=true',
    ),
    json<{data: { attributes: { address: string; market_cap_usd: string | null; fdv_usd: string | null } }[]}>(
      'https://api.geckoterminal.com/api/v2/networks/ton/tokens/multi/' + jettons.join(','),
    ),
  ]);
  if (!rates && !native && !market) {
    return Response.json({ items: [] }, { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const now = new Date().toISOString();
  const items = tokens.tokens.map(({ symbol, master_address }) => {
    const price = positive(rates?.[master_address ?? 'TON']?.prices?.USD);
    const metrics = market?.data?.find(row => row.attributes.address === master_address)?.attributes;
    const coingeckoId = symbol === 'GRAM' ? 'the-open-network' : symbol === 'NOT' ? 'notcoin' : '';
    return {
      symbol, priceUsd: price ? String(price) : null,
      marketCapUsd: positive(native?.[coingeckoId]?.usd_market_cap) ?? positive(metrics?.market_cap_usd),
      fdvUsd: positive(metrics?.fdv_usd),
      fetchedAt: now, source: 'tonapi', status: price ? 'fresh' : 'unavailable',
    };
  });
  return Response.json({ items }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=240',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
