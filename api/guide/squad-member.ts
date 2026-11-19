import { awardGuide } from '../../server/guide-achievements';
import { hmac } from '../../server/telegram-auth';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  const reply = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return reply(405);
  const secret = process.env.GUIDE_SQUAD_WEBHOOK_KEY;
  if (!secret || secret.length < 32) return reply(503);

  const timestamp = request.headers.get('X-Notwise-Timestamp') ?? '';
  const signature = request.headers.get('X-Notwise-Signature') ?? '';
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
      !/^[a-f0-9]{64}$/.test(signature)) return reply(401);

  const length = Number(request.headers.get('Content-Length'));
  if (!Number.isSafeInteger(length) || length < 1 || length > 256) return reply(400);
  const data = await request.text();
  if (data.length > 256) return reply(400);
  const expected = await hmac(new TextEncoder().encode(secret), timestamp + '.' + data);
  let difference = 0;
  for (let index = 0; index < expected.length; index++) {
    difference |= expected[index] ^ Number.parseInt(signature.slice(index * 2, index * 2 + 2), 16);
  }
  if (difference) return reply(401);

  try {
    const body = JSON.parse(data);
    const id = body?.telegramUserId;
    if (body?.squadId !== 575801 || typeof id !== 'string' || !/^[1-9]\d{0,15}$/.test(id) ||
        !Number.isSafeInteger(Number(id))) return reply(400);
    await awardGuide(id, 'squad');
    return reply(204);
  } catch (error) {
    return reply(error instanceof SyntaxError ? 400 : 503);
  }
}
