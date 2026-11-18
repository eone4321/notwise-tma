export const config = { runtime: 'edge' };

type Member = { id: string; name: string; joinedAt: number; seenAt: number };
type Account = Member & { gameLink?: string; gameLinkVerified?: boolean; inviter?: string; referralCode: string };

const namespace = 'notwise:guide:v1:';
const encoder = new TextEncoder();

async function hmac(key: Uint8Array<ArrayBuffer>, message: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
}

async function telegramUser(request: Request, token: string) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('tma ') || authorization.length > 8192) return null;
  const params = new URLSearchParams(authorization.slice(4));
  if (new Set(params.keys()).size !== [...params.keys()].length) return null;
  const hash = params.get('hash') ?? '';
  const authDate = Number(params.get('auth_date'));
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (!/^[a-f0-9]{64}$/.test(hash) || !Number.isSafeInteger(authDate) || age < -30 || age > 3600) return null;
  params.delete('hash');
  params.sort();
  const data = [...params].map(([key, value]) => key + '=' + value).join('\n');
  const signature = await hmac(await hmac(encoder.encode('WebAppData'), token), data);
  let difference = 0;
  for (let index = 0; index < signature.length; index++) {
    difference |= signature[index] ^ parseInt(hash.slice(index * 2, index * 2 + 2), 16);
  }
  if (difference !== 0) return null;
  const user = JSON.parse(params.get('user') ?? 'null');
  if (!Number.isSafeInteger(user?.id) || user.id <= 0 || user.is_bot) return null;
  const name = [user.first_name, user.last_name].filter(value => typeof value === 'string').join(' ').trim().slice(0, 120) || 'Игрок';
  return { id: String(user.id), name, start: params.get('start_param') ?? '' };
}

function gameLink(input: unknown) {
  if (typeof input !== 'string' || input.length > 512) return null;
  try {
    const url = new URL(input.trim());
    const code = url.searchParams.get('startapp') ?? '';
    if (url.origin !== 'https://t.me' || url.pathname.toLowerCase() !== '/notwise_bot/thegame' ||
        url.username || url.password || !/^[a-zA-Z0-9_-]{1,128}$/.test(code)) return null;
    return 'https://t.me/notwise_bot/thegame?startapp=' + code;
  } catch {
    return null;
  }
}

async function channelMember(id: string, token: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getChatMember`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: '@cryptoeone', user_id: Number(id) }),
    signal: AbortSignal.timeout(3500),
  });
  const data = await response.json();
  if (!response.ok || !data.ok || !data.result?.status) throw new Error('Channel check unavailable');
  const { status, is_member: isMember } = data.result;
  return ['creator', 'administrator', 'member'].includes(status) || (status === 'restricted' && isMember === true);
}

async function redis<T>(command: (string | number)[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const secret = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !secret) throw new Error('Database unavailable');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) throw new Error('Database unavailable');
  const result = await response.json();
  if (result.error) throw new Error('Database command failed');
  return result.result;
}

// Account creation, first-touch attribution and indexes update atomically.
const updateAccount = `
local raw = redis.call('HGET', KEYS[1], ARGV[1])
local now = tonumber(ARGV[3])
local account
if raw then
  account = cjson.decode(raw)
else
  local inviter = false
  if ARGV[4] ~= '' then inviter = redis.call('HGET', KEYS[3], ARGV[4]) end
  local code = ARGV[5]
  if redis.call('HSETNX', KEYS[3], code, ARGV[1]) == 0 then return redis.error_reply('referral_collision') end
  account = {id=ARGV[1], joinedAt=now, referralCode=code}
  if inviter and inviter ~= ARGV[1] then
    account.inviter = inviter
    redis.call('ZADD', ARGV[6] .. inviter, now, ARGV[1])
  end
  redis.call('ZADD', KEYS[2], now, ARGV[1])
end
account.name = ARGV[2]
account.seenAt = now
if ARGV[7] == 'save' then
  account.gameLink = ARGV[8]
  account.gameLinkVerified = true
end
if ARGV[7] == 'remove' then
  account.gameLink = nil
  account.gameLinkVerified = nil
end
local encoded = cjson.encode(account)
redis.call('HSET', KEYS[1], ARGV[1], encoded)
return encoded
`;

const accountsKey = namespace + 'accounts';
const membersKey = namespace + 'members';
const invitedPrefix = namespace + 'invited:';
const pageSize = 30;

async function members(key: string, offset: number) {
  const [ids, total] = await Promise.all([
    redis<string[]>(['ZREVRANGE', key, offset, offset + pageSize - 1]),
    redis<number>(['ZCARD', key]),
  ]);
  const accounts = ids.length ? await redis<(string | null)[]>(['HMGET', accountsKey, ...ids]) : [];
  const items: Member[] = accounts.flatMap(raw => {
    if (!raw) return [];
    const { id, name, joinedAt, seenAt } = JSON.parse(raw) as Account;
    return [{ id, name, joinedAt, seenAt }];
  });
  return { items, total };
}

const json = (data: object, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
});

export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const token = process.env.BOT_TOKEN;
  if (!token) return json({ error: 'unavailable' }, 503);
  const user = await telegramUser(request, token).catch(() => null);
  if (!user) return json({ error: 'telegram_required' }, 401);

  const body = await request.text();
  if (body.length > 1024) return json({ error: 'invalid_request' }, 400);
  let input;
  try { input = JSON.parse(body); } catch { return json({ error: 'invalid_request' }, 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'invalid_request' }, 400);

  const { id, name, start } = user;
  const isAdmin = (process.env.GUIDE_ADMIN_IDS ?? '').split(',').some(value => value.trim() === id);
  const action = input.action ?? 'profile';
  const offset = input.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) return json({ error: 'invalid_request' }, 400);
  if (action === 'admin' && !isAdmin) return json({ error: 'forbidden' }, 403);

  try {
    if (action === 'check_subscription') {
      const subscribed = await channelMember(id, token).catch(() => null);
      return subscribed === null ? json({ error: 'subscription_unavailable' }, 503) : json({ subscribed });
    }
    if (action === 'admin') return json(await members(membersKey, offset));
    if (action === 'invited') {
      const { items, total } = await members(invitedPrefix + id, offset);
      return json({ items: items.map(({ name, joinedAt }) => ({ name, joinedAt })), total });
    }
    if (!['profile', 'save', 'remove'].includes(action)) return json({ error: 'invalid_request' }, 400);
    const link = action === 'save' ? gameLink(input.gameLink) : null;
    if (action === 'save' && !link) return json({ error: 'invalid_game_link' }, 400);
    if (link) {
      const subscribed = await channelMember(id, token).catch(() => null);
      if (subscribed === null) return json({ error: 'subscription_unavailable' }, 503);
      if (!subscribed) return json({ error: 'subscription_required' }, 403);
    }
    const inviterCode = /^g_[a-f0-9]{32}$/.test(start) ? start : '';
    const referralCode = 'g_' + crypto.randomUUID().replaceAll('-', '');
    const raw = await redis<string>([
      'EVAL', updateAccount, 3, accountsKey, membersKey, namespace + 'codes',
      id, name, Date.now(), inviterCode, referralCode, invitedPrefix, action, link ?? '',
    ]);
    const account = JSON.parse(raw) as Account;
    const [{ items, total }, referrer] = await Promise.all([
      members(invitedPrefix + id, 0),
      account.inviter ? redis<string | null>(['HGET', accountsKey, account.inviter]) : null,
    ]);
    const source = referrer ? JSON.parse(referrer) as Account : null;
    return json({
      gameLink: account.gameLink ?? null,
      gameEntry: source?.gameLinkVerified ? source.gameLink ?? null : null,
      gameLinkVerified: account.gameLinkVerified === true,
      invited: items.map(({ name, joinedAt }) => ({ name, joinedAt })),
      invitedCount: total,
      referralCode: account.referralCode,
      isAdmin,
    });
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
}
