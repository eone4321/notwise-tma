import { gramToUsdt } from '../../server/ton-rates';
import collections from '../../src/features/market-collections.json';

export const config = { runtime: 'edge' };

export default async function handler() {
  try {
    const promises = collections.map(async ({ id, address }) => {
      try {
        const r = await fetch(`https://api.getgems.io/public-api/v1/collection/basic-info/${address}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(4500),
        });
        if (!r.ok) return { id, address, floor: null, supply: null, available: false };
        const d = await r.json();
        const info = d?.response;
        if (info?.contract_address !== address) return { id, address, floor: null, supply: null, available: false };
        return {
          id,
          address,
          available: true,
          supply: typeof info?.total_supply === 'number' ? info.total_supply : null,
          holders: typeof info?.unique_owners === 'number' ? info.unique_owners : null,
          floor: typeof info?.floor === 'number' && info.floor > 0 ? info.floor : null,
        };
      } catch {
        return { id, address, floor: null, supply: null, available: false };
      }
    });

    const [items, rate] = await Promise.all([Promise.all(promises), gramToUsdt().catch(() => null)]);
    return new Response(JSON.stringify({ items, gramToUsdt: rate }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=1200',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response(JSON.stringify({ items: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
