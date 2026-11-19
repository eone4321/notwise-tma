export const config = { runtime: 'edge' };

const COLLECTIONS = [
  { id: 'genesis', address: 'EQA5HalN4asamSjufbmXF_Wr3jyapCEYcYN0igfBDe5Nmbm7' },
  { id: 'eggs', address: 'EQBFELwdddZzNFXhiZxE1i_4700KG7XmiDTLYzO7UJI-YuRk' },
  { id: 'items', address: 'EQBfQA3gHs5It6jeb6Wo82q_Djei1w1SWb02Vlne-Kc5MSn6' },
  { id: 'skins', address: 'EQC_CN9MU1igRcqmuWeUxxyB6_Uvr4JrnyUCaLe609qQNrRA' },
];

export default async function handler() {
  try {
    const usdtAddress = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

    // 1. Fetch TON and USDT rates from TonAPI
    const ratesPromise = fetch(`https://tonapi.io/v2/rates?tokens=ton,${usdtAddress}&currencies=usd`, {
      headers: { Accept: 'application/json' },
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);

    // 2. Fetch Getgems floor for each collection
    const floorPromises = COLLECTIONS.map(async ({ id, address }) => {
      try {
        const r = await fetch(`https://api.getgems.io/public-api/v1/collection/basic-info/${address}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (!r.ok) return { id, floor: null, currency: 'GRAM' as const, status: 'unavailable' as const };
        const data = await r.json();
        const floor = data?.response?.floor;
        return {
          id,
          floor: typeof floor === 'number' && floor > 0 ? floor : null,
          currency: 'GRAM' as const,
          status: typeof floor === 'number' && floor > 0 ? ('fresh' as const) : ('unavailable' as const),
        };
      } catch {
        return { id, floor: null, currency: 'GRAM' as const, status: 'unavailable' as const };
      }
    });

    const [ratesData, items] = await Promise.all([ratesPromise, Promise.all(floorPromises)]);

    let gramToUsdt: number | null = null;
    if (ratesData?.rates) {
      const tonPrice = ratesData.rates['TON']?.prices?.USD;
      const usdtPrice = ratesData.rates[usdtAddress]?.prices?.USD || 1;
      if (typeof tonPrice === 'number' && tonPrice > 0) {
        gramToUsdt = tonPrice / usdtPrice;
      }
    }

    return new Response(JSON.stringify({ items, gramToUsdt }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response(JSON.stringify({ items: [], gramToUsdt: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
