import publishing from '../../src/domain/game-publishing.json';
import { gramToUsdt } from '../../server/ton-rates';
import { collectionQuotes } from '../../server/getgems-market';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  try {
    const [items, rate] = await Promise.all([collectionQuotes(), gramToUsdt().catch(() => null)]);
    const albumIssue = Object.fromEntries(publishing.albums.map(item => [item.id, item.remaining]));
    try {
      const input = JSON.parse(process.env.GAME_ALBUM_ISSUE_JSON || '{}');
      for (const album of publishing.albums) {
        const remaining = input?.[album.id];
        if (Number.isSafeInteger(remaining) && remaining >= 0 && remaining <= album.edition) {
          albumIssue[album.id] = remaining;
        }
      }
    } catch { /* Availability can only come from a verified game snapshot. */ }
    return Response.json({ items, gramToUsdt: rate, albumIssue }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=1200' },
    });
  } catch {
    return Response.json({ items: [] }, { status: 503 });
  }
}
