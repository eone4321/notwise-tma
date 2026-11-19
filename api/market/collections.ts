import { gramToUsdt } from '../../server/ton-rates';
import { collectionQuotes } from '../../server/getgems-market';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  try {
    const [items, rate] = await Promise.all([collectionQuotes(), gramToUsdt().catch(() => null)]);
    let albumIssue = {};
    try {
      const input = JSON.parse(process.env.GAME_ALBUM_ISSUE_JSON || '{}');
      albumIssue = Object.fromEntries(items.flatMap(({ id }) => {
        if (!id.startsWith('album-')) return [];
        const key = id.slice(6);
        const available = input?.[key];
        return Number.isSafeInteger(available) && available >= 0 ? [[key, available]] : [];
      }));
    } catch { /* Availability can only come from a verified game snapshot. */ }
    return Response.json({ items, gramToUsdt: rate, albumIssue }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=1200' },
    });
  } catch {
    return Response.json({ items: [] }, { status: 503 });
  }
}
