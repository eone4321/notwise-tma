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

export function resetGuideAwards(id: string) {
  return redis(['EVAL', `
    local earned = redis.call('SMEMBERS', KEYS[1])
    for _, achievement in ipairs(earned) do
      local count = tonumber(redis.call('HGET', KEYS[2], achievement) or '0')
      if count > 0 then
        redis.call('HINCRBY', KEYS[2], achievement, -1)
      end
    end
    return redis.call('DEL', KEYS[1], KEYS[3])
  `, 3, prefix + id, stats, prefix + 'visited:' + id]);
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

const awardRules: Record<GuideAchievement, string> = {
  mascot: 'Открыть пасхалку десятью быстрыми нажатиями кнопки CryptoOne на главной.',
  explorer: 'Посетить все девять основных разделов гайда.',
  referral: 'Привязать игровую ссылку после подтверждения подписки на канал.',
  shared: 'Отправить гайд через окно получателя в Telegram и дождаться подтверждения отправки.',
  five: 'Привести пять пользователей, впервые открывших гайд по личной ссылке.',
  community: 'Подтвердить членство в чате CryptoOne при возвращении в гайд.',
  squad: 'Открыть ссылку «Наш сквад» на главной.',
  theme: 'Переключить тему оформления гайда в настройках.',
  cover: 'Установить свой скин совы на обложку главного экрана.',
  joke: 'Пройти шуточную оплату 1 Star в разделе «Секреты».',
};

export async function awardStats() {
  const keys = Object.keys(guideAchievements) as GuideAchievement[];
  const values = await redis<(string | null)[]>(['HMGET', stats, ...keys]);
  return { items: keys.map((id, i) => ({ id, count: Number(values[i]) || 0, rule: awardRules[id] })) };
}
