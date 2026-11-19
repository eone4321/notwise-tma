import { redis } from './redis.js';

export const scopes = ['genesis', 'skins', 'items', 'albums'] as const;
export type SaleScope = typeof scopes[number];
const key = 'notwise:guide:notifications:v1:';
export function saleSubscribers(scope: SaleScope) {
  return scope === 'genesis' ? 'notwise:owl-sales:v1:subscribers' : key + scope;
}

export function salesStart(scope: SaleScope) {
  return scope === 'genesis' ? 'notwise:owl-sales:v1:start' : key + 'start:' + scope;
}

export async function notificationSettings(id: string) {
  const [ready, ...entries] = await redis<(number | string | null)[]>([
    'EVAL', "local r={redis.call('SISMEMBER', KEYS[1], ARGV[1])}; for i=2,#ARGV do r[i]=redis.call('HGET', KEYS[2], ARGV[1]..':'..ARGV[i]) or ''; end; return r",
    2, key + 'started', key + 'settings', id, ...scopes,
  ]);
  return {
    ready: Number(ready) === 1,
    extraAvailable: Boolean(process.env.GETGEMS_READ_TOKEN),
    enabled: Object.fromEntries(scopes.map((scope, i) => [scope, entries[i] === '' ? scope === 'genesis' : entries[i] === '1'])) as Record<SaleScope, boolean>,
  };
}

const preferences = `
local value = ARGV[4]
if value ~= '' then redis.call('HSET', KEYS[2], ARGV[1]..':'..ARGV[2],value)
else value = redis.call('HGET', KEYS[2], ARGV[1]..':'..ARGV[2]) end
if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then
  if value == '1' or (not value and ARGV[2] == 'genesis') then
    redis.call('SET', KEYS[4], ARGV[3], 'NX')
    redis.call('ZADD', KEYS[3], 'NX', ARGV[3], ARGV[1])
  else redis.call('ZREM', KEYS[3], ARGV[1]) end
end
return 1
`;

export async function setSalePreference(id: string, scope: SaleScope, enabled?: boolean) {
  await redis(['EVAL', preferences, 4, key + 'started', key + 'settings', saleSubscribers(scope),
    salesStart(scope), id, scope, Math.floor(Date.now() / 1000), enabled === undefined ? '' : enabled ? '1' : '0']);
}

export async function enableBotDelivery(id: string) {
  await redis(['SADD', key + 'started', id]);
  await Promise.all(scopes.map(scope => setSalePreference(id, scope)));
}

export async function disableBotDelivery(id: string) {
  await redis(['SREM', key + 'started', id]);
  await Promise.all(scopes.map(scope => redis(['ZREM', saleSubscribers(scope), id])));
}
