import mintableItems from '../../src/features/mintable-items.json';
import { itemQuotes } from '../../server/getgems-market';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const snapshot = await itemQuotes().catch(() => ({ items: [], status: 'unavailable' }));
  let mintQuotes = {};
  try {
    const input = JSON.parse(process.env.GAME_MINT_QUOTES_JSON || '{}');
    mintQuotes = Object.fromEntries(Object.keys(mintableItems).flatMap(id =>
      typeof input?.[id] === 'number' && Number.isFinite(input[id]) && input[id] >= 0 ? [[id, input[id]]] : []));
  } catch { /* A missing game quote stays unavailable. */ }
  return Response.json({ ...snapshot, mintQuotes }, {
    headers: { 'Cache-Control': snapshot.status === 'ready' ? 'public, s-maxage=900, stale-while-revalidate=900' : 'public, s-maxage=45' },
  });
}
