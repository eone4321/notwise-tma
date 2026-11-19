import { redis } from './redis';
import { hmac } from './telegram-auth';
import { isGuideEvent, type GuideEvent } from '../src/domain/guide-events';

const prefix = 'notwise:guide:analytics:v1:';
const dayMs = 86_400_000;
const aggregateTtl = 31 * 86_400;

const record = `
local first = redis.call('SET', KEYS[2], '1', 'NX', 'EX', 86400)
if first then redis.call('HINCRBY', KEYS[1], 'active', 1) end
local event = redis.call('SET', KEYS[3], '1', 'NX', 'EX', 900)
if event then redis.call('HINCRBY', KEYS[1], ARGV[1], 1) end
redis.call('EXPIRE', KEYS[1], ARGV[2])
return 1
`;

export async function recordGuideEvent(id: string, token: string, event: unknown) {
  if (!isGuideEvent(event)) return false;
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const pseudonym = Array.from(await hmac(new TextEncoder().encode(token), `guide-analytics:${day}:${id}`),
    byte => byte.toString(16).padStart(2, '0')).join('');
  const key = prefix + day;
  await redis(['EVAL', record, 3, key, `${key}:user:${pseudonym}`, `${key}:event:${pseudonym}:${event}`, event, aggregateTtl]);
  return true;
}

const readDays = `
local result = {}
for i, key in ipairs(KEYS) do result[i] = redis.call('HGETALL', key) end
return result
`;

export async function readGuideAnalytics() {
  const now = Date.now();
  const days = Array.from({ length: 30 }, (_, index) => new Date(now - index * dayMs).toISOString().slice(0, 10));
  const data = await redis<(string | number)[][]>(['EVAL', readDays, days.length, ...days.map(day => prefix + day)]);
  return { days: days.map((day, index) => {
    const row = data[index];
    let active = 0;
    const events: Partial<Record<GuideEvent, number>> = {};
    for (let i = 0; i < row.length; i += 2) {
      const field = row[i];
      const count = Number(row[i + 1]);
      if (field === 'active') active = count;
      else if (isGuideEvent(field)) events[field] = count;
    }
    return { day, active, events };
  }) };
}
