import { telegramUser } from '../../server/telegram-auth';
import { redis } from '../../server/redis';
import { readGuideAnalytics, recordGuideEvent } from '../../server/guide-analytics';
import { awardGuide, awardStats, resetGuideAwards, trackExplorer, userAwards } from '../../server/guide-achievements';
import { notificationSettings, setSalePreference, scopes } from '../../server/guide-notifications';
import { guideProgress } from '../../server/guide-progress';
import { marketDiagnostics, refreshMarket } from '../../server/getgems-market';

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
  if (!response.ok || !data.ok || !data.result?.status) {
    throw new Error(typeof data?.description === 'string' ? data.description : 'Channel check unavailable');
  }
  return data.result;
}

function isJoinedStatus(result: { status?: string; is_member?: boolean }) {
  return ['creator', 'administrator', 'member'].includes(result.status ?? '') ||
    (result.status === 'restricted' && result.is_member === true);
}

async function channelMember(id: string, token: string) {
  return isJoinedStatus(await channelStatus(id, token));
}

async function resolveCommunityChatId(token: string): Promise<string | number | null> {
  if (process.env.GUIDE_CHAT_ID) return process.env.GUIDE_CHAT_ID;
  const cached = await redis<string | null>(['GET', namespace + 'linked-chat-id']).catch(() => null);
  if (cached) return cached;
  const channel = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: '@cryptoeone' }),
    signal: AbortSignal.timeout(3500),
  }).then(response => response.json());
  const linked = channel?.result?.linked_chat_id;
  if (linked) {
    await redis(['SET', namespace + 'linked-chat-id', String(linked), 'EX', 600]).catch(() => null);
    return linked;
  }
  return null;
}

type CommunityCheck =
  | { ok: true; joined: boolean }
  | { ok: false; issue: 'no_chat' | 'bot_no_access' | 'unavailable' };

async function checkCommunityMember(id: string, token: string): Promise<CommunityCheck> {
  try {
    const chatId = await resolveCommunityChatId(token);
    if (!chatId) return { ok: false, issue: 'no_chat' };
    const status = await channelStatus(id, token, chatId);
    return { ok: true, joined: isJoinedStatus(status) };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('chat not found') || message.includes('not a member') ||
        message.includes('member list is inaccessible') || message.includes('kicked') ||
        message.includes('forbidden')) {
      return { ok: false, issue: 'bot_no_access' };
    }
    return { ok: false, issue: 'unavailable' };
  }
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
end
account.name = ARGV[2]
account.avatar = ARGV[9] ~= '' and ARGV[9] or nil
account.seenAt = now
redis.call('ZADD', KEYS[2], now, ARGV[1])
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
  const total = await redis<number>(['ZCARD', key]);
  // For the global admin list, sort all accounts by seenAt DESC so recently active users are always first,
  // including users who visited before ZADD started updating on seenAt.
  if (key === membersKey && total > 0 && total <= 2500) {
    const rawList = await redis<string[]>(['HVALS', accountsKey]);
    const all: Member[] = [];
    for (const raw of rawList ?? []) {
      try {
        const { id, name, avatar, joinedAt, seenAt } = JSON.parse(raw) as Account;
        all.push({ id, name, avatar, joinedAt, seenAt: seenAt || joinedAt });
      } catch { /* skip malformed */ }
    }
    all.sort((a, b) => (b.seenAt - a.seenAt) || (b.joinedAt - a.joinedAt));
    return { items: all.slice(offset, offset + pageSize), total: all.length };
  }
  const ids = await redis<string[]>(['ZREVRANGE', key, offset, offset + pageSize - 1]);
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
    if (action === 'visit_squad') {
      await awardGuide(id, 'squad');
      await recordGuideEvent(id, token, 'action:squad').catch(() => false);
      return json({ earned: await userAwards(id) });
    }
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
      let earned = await userAwards(id);
      let chatIssue: string | undefined;
      if (!earned.includes('community')) {
        const shouldCheck = await redis(['SET', namespace + 'auto-chat:' + id, '1', 'NX', 'EX', 20]).catch(() => null);
        if (shouldCheck) {
          const check = await checkCommunityMember(id, token);
          if (check.ok && check.joined) {
            await awardGuide(id, 'community');
            earned = await userAwards(id);
          } else if (!check.ok && check.issue !== 'unavailable') {
            chatIssue = check.issue;
          }
        }
      }
      return json(chatIssue ? { earned, chatIssue } : { earned });
    }
    if (action === 'mascot' || action === 'shared' || action === 'theme' || action === 'joke') {
      if (action === 'shared' && !await redis(['GETDEL', namespace + 'pending-share:' + id])) {
        return json({ error: 'share_unavailable' }, 409);
      }
      await awardGuide(id, action);
      return json({ earned: await userAwards(id) });
    }
    if (action === 'check_chat') {
      if (!await redis(['SET', namespace + 'chat-check:' + id, '1', 'NX', 'EX', 2])) {
        return json({ joined: false, earned: await userAwards(id) });
      }
      const check = await checkCommunityMember(id, token);
      if (!check.ok) {
        return json({ joined: false, chatIssue: check.issue, earned: await userAwards(id) });
      }
      if (check.joined) await awardGuide(id, 'community');
      return json({ joined: check.joined, earned: await userAwards(id) });
    }
    if (action === 'prepare_share') {
      if (!await redis(['SET', namespace + 'prepare-share:' + id, '1', 'NX', 'EX', 3])) {
        return json({ error: 'share_unavailable' }, 429);
      }
      const requestedLang = input.language === 'ru' || input.language === 'en'
        ? input.language
        : input.locale === 'ru' || input.locale === 'en'
          ? input.locale
          : null;
      const headerLang = request.headers.get('accept-language') ?? '';
      const isRu = requestedLang
        ? requestedLang === 'ru'
        : /^ru\b/i.test(user.language ?? headerLang);
      const raw = input.personal !== false ? await redis<string | null>(['HGET', accountsKey, id]) : null;
      const account = raw ? JSON.parse(raw) as Account : null;
      const code = account?.referralCode ?? '';
      const url = 'https://t.me/NotWiseGuideBot?startapp' + (code ? '=' + code : '');
      const result = await fetch(`https://api.telegram.org/bot${token}/savePreparedInlineMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          user_id: Number(id), allow_user_chats: true, allow_group_chats: true,
          result: {
            type: 'article',
            id: 'guide',
            title: isRu ? 'Гайд по NOT Wise' : 'NOT Wise Guide',
            input_message_content: {
              message_text: (isRu ? 'Гайд по NOT Wise 🦉\n' : 'NOT Wise Guide 🦉\n') + url,
            },
          },
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
    if (action === 'admin' || action === 'analytics' || action === 'award_stats' || action === 'market_status' || action === 'market_refresh') {
      if (!await guideAdmin(id, token)) return json({ error: 'forbidden' }, 403);
      if (action === 'market_refresh') {
        const allowed = await redis(['SET', namespace + 'admin-market-refresh', '1', 'NX', 'EX', 10]).catch(() => 'OK');
        const refreshSummary = allowed ? await refreshMarket().catch(() => null) : null;
        return json({ ...await marketDiagnostics(), refreshSummary, throttled: !allowed });
      }
      return json(
        action === 'admin' ? await members(membersKey, offset) :
        action === 'award_stats' ? await awardStats() :
        action === 'market_status' ? await marketDiagnostics() :
        await readGuideAnalytics(),
      );
    }
    if (action === 'progress' || action === 'mark') {
      const progress = await guideProgress(redis, namespace, id, input);
      if (progress === null) return json({ error: 'invalid_request' }, 400);
      if (progress === false) return json({ error: 'profile_required' }, 409);
      return json(progress);
    }
    if (action === 'reset_my_awards') {
      if (!await guideAdmin(id, token)) return json({ error: 'forbidden' }, 403);
      await resetGuideAwards(id);
      return json({ ok: true });
    }
    if (action === 'reset_my_state') {
      const marks = await redis<string[]>(['HKEYS', namespace + 'progress:' + id]).catch(() => []);
      for (const mark of marks) {
        if (mark.startsWith('c:')) {
          await redis(['HINCRBY', namespace + 'completion-counts', mark.slice(2), -1]).catch(() => null);
        }
      }
      await Promise.all([
        redis(['DEL', namespace + 'progress:' + id, namespace + 'progress-imported:' + id]).catch(() => null),
        resetGuideAwards(id),
        redis(['DEL', namespace + 'auto-chat:' + id, namespace + 'chat-check:' + id]).catch(() => null),
      ]);
      return json({ ok: true });
    }
    if (action === 'check_subscription') {
      const allowed = await redis(['SET', namespace + 'sub-check:' + id, '1', 'NX', 'EX', 2]).catch(() => 'OK');
      if (!allowed) return json({ error: 'rate_limited' }, 429);
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
    const refMatch = start.match(/(?:^|--)(g_[a-f0-9]{32})$/);
    const inviterCode = refMatch ? refMatch[1] : '';
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
