import { collectionQuotes } from '../../server/getgems-market';
import { gramToUsdt } from '../../server/ton-rates';

export const config = { runtime: 'edge' };

const FEATURED_IDS = new Set(['genesis', 'eggs', 'items', 'skins']);

export default async function handler() {
  try {
    const [quotes, rate] = await Promise.all([
      collectionQuotes().catch(() => []),
      gramToUsdt().catch(() => null),
    ]);

    const items = quotes
      .filter(quote => FEATURED_IDS.has(quote.id))
      .map(quote => ({
        id: quote.id,
        floor: typeof quote.floor === 'number' && quote.floor > 0 ? quote.floor : null,
        currency: 'GRAM' as const,
        status: quote.floor && quote.floor > 0 ? (quote.available ? ('fresh' as const) : ('stale' as const)) : ('unavailable' as const),
      }));

    return new Response(JSON.stringify({ items, gramToUsdt: rate }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=45, s-maxage=45, stale-while-revalidate=180',
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
