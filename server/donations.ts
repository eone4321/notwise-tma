import { redis } from './redis';
import { hmac, telegramUser } from './telegram-auth';

const namespace = 'notwise:guide:donation:';
const amounts = new Set([1, 3, 5, 10, 25, 50, 100, 250, 500, 1000]);
const payloadPrefix = 'guide_support:';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const orderKey = (userId: number | string, id: string) => namespace + userId + ':' + id;

const json = (data: object, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function botRequest<T>(token: string, method: string, body: object): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3500),
  });
  const answer = await response.json();
  if (!response.ok || !answer.ok) throw new Error('Telegram request failed');
  return answer.result;
}

export async function validWebhook(request: Request, token: string) {
  const received = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  const expected = await hmac(new TextEncoder().encode(token), 'notwise-guide:webhook:v1');
  let difference = 0;
  for (let index = 0; index < expected.length; index++) {
    difference |= expected[index] ^ parseInt(received.slice(index * 2, index * 2 + 2), 16);
  }
  return difference === 0;
}

const claimOrder = `
local amount = redis.call('HGET', KEYS[1], 'amount')
if amount and amount ~= ARGV[1] then return {'conflict'} end
local invoice = redis.call('HGET', KEYS[1], 'invoice')
if invoice then return {'ready', invoice} end
if redis.call('SET', KEYS[2], 1, 'EX', 15, 'NX') == false then return {'busy'} end
redis.call('HSET', KEYS[1], 'amount', ARGV[1])
redis.call('EXPIRE', KEYS[1], 2592000)
return {'create'}
`;

export async function donationInvoice(request: Request) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const token = process.env.BOT_TOKEN;
  if (!token) return json({ error: 'unavailable' }, 503);
  const user = await telegramUser(request, token).catch(() => null);
  if (!user) return json({ error: 'telegram_required' }, 401);
  const id = request.headers.get('Idempotency-Key') ?? '';
  if (!uuid.test(id) || Number(request.headers.get('Content-Length')) > 512) {
    return json({ error: 'invalid_request' }, 400);
  }
  const body = await request.text();
  if (body.length > 512) return json({ error: 'invalid_request' }, 400);
  let amount: number;
  try { amount = JSON.parse(body)?.amountStars; } catch { return json({ error: 'invalid_request' }, 400); }
  if (!amounts.has(amount)) return json({ error: 'invalid_request' }, 400);

  const key = orderKey(user.id, id);
  try {
    const [state, invoice] = await redis<string[]>(['EVAL', claimOrder, 2, key, key + ':creating', amount]);
    if (state === 'conflict') return json({ error: 'idempotency_conflict' }, 409);
    if (state === 'ready') return json({ id, invoiceUrl: invoice });
    if (state !== 'create') return json({ error: 'invoice_pending' }, 409);
    const invoiceUrl = await botRequest<string>(token, 'createInvoiceLink', {
      title: 'Поддержка CryptoOne',
      description: 'Добровольная поддержка Not Wise Guide.',
      currency: 'XTR',
      provider_token: '',
      payload: payloadPrefix + id,
      prices: [{ label: 'Поддержка проекта', amount }],
    });
    await redis(['HSET', key, 'invoice', invoiceUrl]);
    return json({ id, invoiceUrl });
  } catch {
    return json({ error: 'invoice_unavailable' }, 503);
  }
}

export async function donationStatus(request: Request) {
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
  const token = process.env.BOT_TOKEN;
  if (!token) return json({ error: 'unavailable' }, 503);
  const user = await telegramUser(request, token).catch(() => null);
  if (!user) return json({ error: 'telegram_required' }, 401);
  const id = new URL(request.url).pathname.split('/').at(-1) ?? '';
  if (!uuid.test(id)) return json({ error: 'not_found' }, 404);
  try {
    const [amount, charge] = await redis<[string | null, string | null]>(
      ['HMGET', orderKey(user.id, id), 'amount', 'charge'],
    );
    return amount ? json({ id, state: charge ? 'paid' : 'pending' }) : json({ error: 'not_found' }, 404);
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
}

type Payment = { currency: string; total_amount: number; invoice_payload: string };
type Checkout = Payment & { id: string; from: { id: number } };

function paymentOrder(payment: Payment, userId: number) {
  const id = typeof payment.invoice_payload === 'string' && payment.invoice_payload.startsWith(payloadPrefix)
    ? payment.invoice_payload.slice(payloadPrefix.length) : '';
  return uuid.test(id) && payment.currency === 'XTR' && amounts.has(payment.total_amount) && Number.isSafeInteger(userId)
    ? orderKey(userId, id) : null;
}

const claimCheckout = `
if redis.call('HGET', KEYS[1], 'amount') ~= ARGV[1] or
  redis.call('HEXISTS', KEYS[1], 'invoice') == 0 or
  redis.call('HEXISTS', KEYS[1], 'charge') == 1 then return 0 end
local checkout = redis.call('GET', KEYS[2])
if checkout then return checkout == ARGV[2] and 1 or 0 end
redis.call('SET', KEYS[2], ARGV[2], 'EX', 900)
return 1
`;

export async function answerCheckout(token: string, checkout: Checkout) {
  const key = paymentOrder(checkout, checkout.from.id);
  const accepted = key && await redis<number>([
    'EVAL', claimCheckout, 2, key, key + ':checkout', checkout.total_amount, checkout.id,
  ]);
  await botRequest(token, 'answerPreCheckoutQuery', {
    pre_checkout_query_id: checkout.id,
    ok: accepted === 1,
    ...(accepted !== 1 ? { error_message: 'Счёт недоступен. Создай новый в гайде.' } : {}),
  });
}

const savePayment = `
if redis.call('HGET', KEYS[1], 'amount') ~= ARGV[1] then return 0 end
redis.call('HSETNX', KEYS[1], 'charge', ARGV[2])
redis.call('PERSIST', KEYS[1])
return 1
`;

export async function recordPayment(payment: Payment & { telegram_payment_charge_id: string }, userId: number) {
  const key = paymentOrder(payment, userId);
  if (key && payment.telegram_payment_charge_id) {
    await redis(['EVAL', savePayment, 1, key, payment.total_amount, payment.telegram_payment_charge_id]);
  }
}
