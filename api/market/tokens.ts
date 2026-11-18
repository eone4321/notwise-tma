export const config = { runtime: 'edge' };

const TOKENS = [
  { symbol: 'GRAM', address: 'ton' },
  { symbol: 'NOT', address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT' },
  { symbol: 'GRC', address: 'EQAu7qxfVgMg0tpnosBpARYOG--W1EUuX_5H_vOQtTVuHnrn' },
  { symbol: 'TNT', address: 'EQB2Vubu0fyGCvhUM88kxfMVFJ8Nr9QuqH40mG4sKbhg_TNT' },
  { symbol: 'PEW', address: 'EQA-uwAf8ED_aJGX2BJve4_EaquHgFiQyUKopQjucLyY_PEW' },
];

export default async function handler(req: Request) {
  try {
    const addressList = TOKENS.map(t => t.address).join(',');
    const res = await fetch(`https://tonapi.io/v2/rates?tokens=${addressList}&currencies=usd`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('TonAPI error');
    const data = await res.json();
    const rates = data?.rates || {};

    const now = new Date().toISOString();
    const items = TOKENS.map(({ symbol, address }) => {
      const rate = rates[address] || (address === 'ton' ? rates['TON'] : null);
      const price = rate?.prices?.USD;
      return {
        symbol,
        priceUsd: typeof price === 'number' && price > 0 ? String(price) : null,
        fetchedAt: now,
        source: 'tonapi',
        status: price ? 'fresh' : 'unavailable',
      };
    });

    return new Response(JSON.stringify({ items }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=240',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'failed_to_fetch_rates', items: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
