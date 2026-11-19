import { telegramUser } from '../../server/telegram-auth';
import { redis } from '../../server/redis';
import { readGuideAnalytics, recordGuideEvent } from '../../server/guide-analytics';
import { awardGuide, awardStats, trackExplorer, userAwards } from '../../server/guide-achievements';
import { notificationSettings, setSalePreference, scopes } from '../../server/guide-notifications';
import { guideProgress } from '../../server/guide-progress';

export const config = { runtime: 'edge' };

type Member = { id: string; name: string; avatar?: string; joinedAt: number; seenAt: number };
type Account = Member & { gameLink?: string; gameLinkVerified?: boolean; inviter?: string; referralCode: string };

const namespace = 'notwise:guide:v1:';
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

async function channelStatus(id: string, token: string, chatId: string | number = '@cryptoeone') {
  const response = await fetch(`https://api.telegram.org/bot${token}/getChatMember`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, user_id: Number(id) }),
    signal: AbortSignal.timeout(3500),
  });
  const data = await response.json();
  if (!response.ok || !data.ok || !data.result?.status) throw new Error('Channel check unavailable');
  return data.result;
}

async function channelMember(id: string, token: string) {
  const { status, is_member: isMember } = await channelStatus(id, token);
  return ['creator', 'administrator', 'member'].includes(status) || (status === 'restricted' && isMember === true);
}

async function guideAdmin(id: string, token: string) {
  const ids = (process.env.GUIDE_ADMIN_IDS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  if (ids.length) return ids.includes(id);
  return (await channelStatus(id, token)).status === 'creator';
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
account.avatar = ARGV[9] ~= '' and ARGV[9] or nil
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
    const { id, name, avatar, joinedAt, seenAt } = JSON.parse(raw) as Account;
    return [{ id, name, avatar, joinedAt, seenAt }];
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

  const { id, name, avatar, start } = user;
  const action = input.action ?? 'profile';
  const offset = input.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) return json({ error: 'invalid_request' }, 400);

  try {
    if (action === 'track') {
      if (!await recordGuideEvent(id, token, input.event)) return json({ error: 'invalid_request' }, 400);
      await trackExplorer(id, input.event);
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }
    if (action === 'achievements') {
      const [raw, invited] = await Promise.all([
        redis<string | null>(['HGET', accountsKey, id]), redis<number>(['ZCARD', invitedPrefix + id]),
      ]);
      if (raw && (JSON.parse(raw) as Account).gameLinkVerified) await awardGuide(id, 'referral');
      if (invited >= 5) await awardGuide(id, 'five');
      return json({ earned: await userAwards(id) });
    }
    if (action === 'mascot' || action === 'shared') {
      if (action === 'shared' && !await redis(['GETDEL', namespace + 'pending-share:' + id])) {
        return json({ error: 'share_unavailable' }, 409);
      }
      await awardGuide(id, action);
      return json({ earned: await userAwards(id) });
    }
    if (action === 'check_chat') {
      if (!await redis(['SET', namespace + 'chat-check:' + id, '1', 'NX', 'EX', 3])) {
        return json({ error: 'chat_unavailable' }, 429);
      }
      let chatId: string | number = process.env.GUIDE_CHAT_ID || '';
      if (!chatId) {
        const channel = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: '@cryptoeone' }), signal: AbortSignal.timeout(3500),
        }).then(response => response.json());
        chatId = channel.result?.linked_chat_id;
      }
      if (!chatId) return json({ error: 'chat_unavailable' }, 503);
      const status = await channelStatus(id, token, chatId);
      const joined = ['creator', 'administrator', 'member'].includes(status.status) || status.is_member === true;
      if (joined) await awardGuide(id, 'community');
      return json({ joined, earned: await userAwards(id) });
    }
    if (action === 'prepare_share') {
      if (!await redis(['SET', namespace + 'prepare-share:' + id, '1', 'NX', 'EX', 3])) {
        return json({ error: 'share_unavailable' }, 429);
      }
      const raw = input.personal === true ? await redis<string | null>(['HGET', accountsKey, id]) : null;
      const account = raw ? JSON.parse(raw) as Account : null;
      const code = account?.gameLinkVerified ? account.referralCode : '';
      const url = 'https://t.me/NotWiseGuideBot?startapp' + (code ? '=' + code : '');
      const result = await fetch(`https://api.telegram.org/bot${token}/savePreparedInlineMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          user_id: Number(id), allow_user_chats: true, allow_group_chats: true,
          result: { type: 'article', id: 'guide', title: 'NOT Wise Guide',
            input_message_content: { message_text: 'Гайд по NOT Wise 🦉\n' + url } },
        }),
      }).then(response => response.json());
      if (!result.ok || typeof result.result?.id !== 'string') return json({ error: 'share_unavailable' }, 503);
      await redis(['SET', namespace + 'pending-share:' + id, '1', 'EX', 600]);
      return json({ messageId: result.result.id });
    }
    if (action === 'notifications') {
      if (input.scope !== undefined) {
        const scope = scopes.find(value => value === input.scope);
        if (!scope || typeof input.enabled !== 'boolean' || (scope !== 'genesis' && !process.env.GETGEMS_READ_TOKEN)){
          return json({ error: 'invalid_request' }, 400);
        }
        await setSalePreference(id, scope, input.enabled);
      }
      return json(await notificationSettings(id));
    }
    if (action === 'admin' || action === 'analytics' || action === 'award_stats') {
      if (!await guideAdmin(id, token)) return json({ error: 'forbidden' }, 403);
      return json(action === 'admin' ? await members(membersKey, offset) : action === 'award_stats' ? await awardStats() : await readGuideAnalytics());
    }
    if (action === 'progress' || action === 'mark') {
      const progress = await guideProgress(redis, namespace, id, input);
      if (progress === null) return json({ error: 'invalid_request' }, 400);
      if (progress === false) return json({ error: 'profile_required' }, 409);
      return json(progress);
    }
    if (action === 'check_subscription') {
      const subscribed = await channelMember(id, token).catch(() => null);
      return subscribed === null ? json({ error: 'subscription_unavailable' }, 503) : json({ subscribed });
    }
    if (action === 'invited') {
      const { items, total } = await members(invitedPrefix + id, offset);
      return json({ items: items.map(({ name, avatar, joinedAt }) => ({ name, avatar, joinedAt })), total });
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
    const admin = guideAdmin(id, token).catch(() => false);
    const raw = await redis<string>([
      'EVAL', updateAccount, 3, accountsKey, membersKey, namespace + 'codes',
      id, name, Date.now(), inviterCode, referralCode, invitedPrefix, action, link ?? '', avatar,
    ]);
    const account = JSON.parse(raw) as Account;
    const [{ items, total }, referrer] = await Promise.all([
      members(invitedPrefix + id, 0),
      account.inviter ? redis<string | null>(['HGET', accountsKey, account.inviter]) : null,
    ]);
    const source = referrer ? JSON.parse(referrer) as Account : null;
    return json({
      userId: id,
      gameLink: account.gameLink ?? null,
      gameEntry: source?.gameLinkVerified ? source.gameLink ?? null : null,
      gameLinkVerified: account.gameLinkVerified === true,
      invited: items.map(({ name, avatar, joinedAt }) => ({ name, avatar, joinedAt })),
      invitedCount: total,
      referralCode: account.referralCode,
      isAdmin: await admin,
      language: user.language,
    });
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
}
