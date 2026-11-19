import { redis } from './redis.js';
import { getgemsHistory, getgemsItemLink, notAddress, salesFromTrace, tonTransfers, type OwlSale } from './owl-sales-feed.js';
import { tonRates, usdtAddress } from './ton-rates.js';

const prefix = 'notwise:owl-sales:v1:';
const subscribers = prefix + 'subscribers';
const pending = prefix + 'pending';
const startKey = prefix + 'start';
const keepSeconds = 60 * 60 * 24 * 7;

export async function setOwlSaleSubscription(chatId: number, enabled: boolean) {
  if (!Number.isSafeInteger(chatId) || chatId <= 0) return;
  if (enabled) {
    const now = Math.floor(Date.now() / 1000);
    await redis(['SET', startKey, now, 'NX']);
    await redis(['ZADD', subscribers, 'NX', now, chatId]);
  } else {
    await redis(['ZREM', subscribers, chatId]);
  }
}

const enqueue = `
if redis.call('SET', KEYS[1], 1, 'EX', ARGV[4], 'NX') then
  redis.call('HSET', KEYS[2], ARGV[1], ARGV[3])
  redis.call('ZADD', KEYS[3], ARGV[2], ARGV[1])
end
`;

async function remember(sales: OwlSale[]) {
  for (const sale of sales) {
    await redis(['EVAL', enqueue, 3, prefix + 'seen:' + sale.id, prefix + 'sales', pending,
      sale.id, sale.at, JSON.stringify(sale), keepSeconds]);
  }
}

async function collectSales(start: number, until: number) {
  if (until < start) return;
  const key = process.env.GETGEMS_READ_TOKEN;
  if (key) {
    const time = Number(await redis<string | null>(['GET', prefix + 'getgems-time'])) || start;
    const checkpoint = await redis<string | null>(['GET', prefix + 'getgems-page']);
    const page = checkpoint ? JSON.parse(checkpoint) as { until: number; cursor: string } : { until, cursor: '' };
    const { sales, cursor } = await getgemsHistory(key, time, page.until, page.cursor);
    await remember(sales);
    if (cursor) {
      await redis(['SET', prefix + 'getgems-page', JSON.stringify({ until: page.until, cursor })]);
    } else {
      await redis(['SET', prefix + 'getgems-time', page.until + 1]);
      await redis(['DEL', prefix + 'getgems-page']);
    }
    return;
  }

  const lt = await redis<string | null>(['GET', prefix + 'ton-lt']);
  const { transfers, addresses } = await tonTransfers(start, until, lt ?? '');
  const checked = new Set<string>();
  let checkpoint = lt;
  try {
    for (const transfer of transfers) {
      if (!checked.has(transfer.trace)) {
        if (checked.size >= 5) break;
        await remember(await salesFromTrace(transfer.trace, addresses));
        checked.add(transfer.trace);
      }
      checkpoint = transfer.lt;
    }
  } finally {
    if (checkpoint && checkpoint !== lt) await redis(['SET', prefix + 'ton-lt', checkpoint]);
  }
}

export function saleMessage(sale: OwlSale, priceUsd: number | null) {
  const amount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 9 }).format(sale.amount);
  const usd = priceUsd ? new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 2,
  }).format(sale.amount * priceUsd) : null;
  return `${sale.name} was sold for ${amount} ${sale.currency}` + (usd ? ` (≈ ${usd})` : '');
}

async function notify(token: string, sale: OwlSale, chatId: string, priceUsd: number) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: saleMessage(sale, priceUsd),
      reply_markup: { inline_keyboard: [[{ text: 'Посмотреть на Getgems', url: getgemsItemLink(sale.nft) }]] },
    }),
    signal: AbortSignal.timeout(3500),
  });
  const data = await response.json();
  if (data.error_code === 403) {
    await redis(['ZREM', subscribers, chatId]);
    return;
  }
  if (!response.ok || !data.ok) throw new Error('Sale alert retry needed');
}

const finish = `
redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('HDEL', KEYS[2], ARGV[1])
redis.call('DEL', KEYS[3])
`;

async function deliver(token: string, deadline: number) {
  const ids = await redis<string[]>(['ZRANGE', pending, 0, 9]);
  if (!ids.length) return 0;
  const rows = await redis<(string | null)[]>(['HMGET', prefix + 'sales', ...ids]);
  const rates = await tonRates(['ton', usdtAddress, notAddress]);
  let sent = 0;
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    const saved = rows[index];
    if (!saved) {
      await redis(['ZREM', pending, id]);
      continue;
    }
    const sale = JSON.parse(saved) as OwlSale;
    const rate = rates[sale.currency === 'GRAM' ? 'TON' : sale.currency === 'USDT' ? usdtAddress : notAddress]?.prices?.USD;
    if (!rate || rate <= 0) continue;
    const receipt = prefix + 'sent:' + id;
    const [chats, delivered] = await Promise.all([
      redis<string[]>(['ZRANGEBYSCORE', subscribers, '-inf', sale.at]),
      redis<string[]>(['SMEMBERS', receipt]),
    ]);
    const alreadySent = new Set(delivered);
    for (const chat of chats) {
      if (alreadySent.has(chat)) continue;
      if (Date.now() >= deadline || sent >= 24) return sent;
      const current = await redis<string | null>(['ZSCORE', subscribers, chat]);
      if (current === null || Number(current) > sale.at) continue;
      await notify(token, sale, chat, rate);
      await redis(['SADD', receipt, chat]);
      sent++;
    }
    await redis(['EVAL', finish, 3, pending, prefix + 'sales', receipt, id]);
  }
  return sent;
}

export async function pollOwlSales() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error('Bot unavailable');
  const lock = prefix + 'lock';
  const run = crypto.randomUUID();
  if (!await redis<string | null>(['SET', lock, run, 'EX', 70, 'NX'])) return { status: 'busy' };
  const deadline = Date.now() + 42_000;
  try {
    if (!await redis<number>(['ZCARD', subscribers])) return { status: 'no-subscribers' };
    const start = Number(await redis<string | null>(['GET', startKey]));
    let feedDown = false;
    try {
      if (start) await collectSales(start, Math.floor(Date.now() / 1000) - 120);
    } catch {
      feedDown = true;
    }
    const sent = await deliver(token, deadline);
    if (feedDown) throw new Error('Sale feed retry needed');
    return { status: 'checked', sent };
  } finally {
    await redis(['EVAL', "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end", 1, lock, run]);
  }
}
