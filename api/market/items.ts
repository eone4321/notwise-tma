import mintableItems from '../../src/features/mintable-items.json';
import publishing from '../../src/domain/game-publishing.json';
import { itemQuotes } from '../../server/getgems-market';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const snapshot = await itemQuotes().catch(() => ({ items: [], status: 'unavailable' }));
  const base = publishing.itemMintGram as Record<number, number>;
  const mintQuotes = Object.fromEntries(Object.entries(mintableItems).map(([slug, id]) => [slug, base[id]]));
  try {
    const input = JSON.parse(process.env.GAME_MINT_QUOTES_JSON || '{}');
    for (const slug of Object.keys(mintQuotes)) {
      const value = input?.[slug];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) mintQuotes[slug] = value;
    }
  } catch { /* The last verified standard fees are still available. */ }
  return Response.json({ ...snapshot, mintQuotes }, {
    headers: { 'Cache-Control': snapshot.status === 'unavailable' ? 'no-store' : 'public, max-age=0, s-maxage=45' },
  });
}
