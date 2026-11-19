import { redis } from './redis';
import { explorerSections, guideAchievements, type GuideAchievement } from '../src/domain/guide-achievements';

const prefix = 'notwise:guide:achievements:v1:';
const stats = prefix + 'totals';
const award = `
if redis.call('SADD', KEYS[1], ARGV[1]) == 1 then
  redis.call('HINCRBY', KEYS[2], ARGV[1], 1)
end
return 1
`;

export async function awardGuide(id: string, achievement: GuideAchievement) {
  await redis(['EVAL', award, 2, prefix + id, stats, achievement]);
}

export async function trackExplorer(id: string, event: unknown) {
  if (typeof event !== 'string' || !event.startsWith('view:')) return;
  const section = event.slice(5);
  if (!explorerSections.includes(section)) return;
  const visited = await redis<number>(['EVAL', "redis.call('SADD', KEYS[1], ARGV[1]); return redis.call('SCARD', KEYS[1])",
    1, prefix + 'visited:' + id, section]);
  if (visited >= explorerSections.length) await awardGuide(id, 'explorer');
}

export function userAwards(id: string) {
  return redis<GuideAchievement[]>(['SMEMBERS', prefix + id]);
}

export async function awardStats() {
  const keys = Object.keys(guideAchievements);
  const values = await redis<(string | null)[]>(['HMGET', stats, ...keys]);
  return { items: keys.map((id, i) => ({ id, count: Number(values[i]) || 0 })) };
}
