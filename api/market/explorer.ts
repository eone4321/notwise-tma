import { marketExplorer } from '../../server/getgems-market';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const snapshot = await marketExplorer().catch(() => ({
    updatedAt: null,
    status: 'unavailable' as const,
    buckets: [],
  }));
  return Response.json({ ...snapshot, items: snapshot.buckets }, {
    headers: {
      'Cache-Control': snapshot.status === 'unavailable' ? 'no-store' : 'public, max-age=0, s-maxage=45',
    },
  });
}
