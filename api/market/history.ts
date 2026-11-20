import { marketHistory, type HistoryRange } from '../../server/getgems-market';

export const config = { runtime: 'edge' };

const validRanges = new Set<HistoryRange>(['24h', '7d', '30d', 'all']);

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase();
  const rawEnchant = (url.searchParams.get('enchant') ?? '0').trim().toLowerCase();
  const enchantParam = Number(rawEnchant);
  const enchant: number | 'all' = rawEnchant === 'all'
    ? 'all'
    : Number.isSafeInteger(enchantParam) && enchantParam >= 0 && enchantParam <= 20
      ? enchantParam
      : 0;
  const rawRange = (url.searchParams.get('range') ?? '7d') as HistoryRange;
  const range: HistoryRange = validRanges.has(rawRange) ? rawRange : '7d';

  if (!/^[a-z0-9:-]{1,48}$/.test(slug)) {
    return Response.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const data = await marketHistory(slug, enchant, range).catch(() => ({
    slug,
    enchant,
    range,
    points: [],
  }));

  return Response.json(data, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' },
  });
}
