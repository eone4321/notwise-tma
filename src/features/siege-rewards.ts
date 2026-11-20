import type { GameAttributeName } from '../ui/GameGlyph';

type RewardKind = 'coins' | 'squad_silver' | GameAttributeName;

export const siegeRewardLabels: Record<RewardKind, string> = {
  coins: 'Монеты', squad_silver: 'Серебро сквада',
  wisdom: 'Мудрость', endurance: 'Выносливость', agility: 'Ловкость', strength: 'Сила',
};

export const siegeRewardLabelsEn: Record<RewardKind, string> = {
  coins: 'Coins', squad_silver: 'Squad silver',
  wisdom: 'Wisdom', endurance: 'Endurance', agility: 'Agility', strength: 'Strength',
};

export function getSiegeRewardLabel(kind: RewardKind, en = false): string {
  return en ? siegeRewardLabelsEn[kind] : siegeRewardLabels[kind];
}

type SiegeReward = readonly [kind: RewardKind, amount: number];

// Authenticated in-game territory rewards, 20 November 2026 at 04:16 (UTC+7).
export const territoryRewards: Readonly<Partial<Record<string, SiegeReward>>> = {
  'amber-grove': ['coins', 500],
  'dawn-wood': ['squad_silver', 100],
  'deep-wood': ['wisdom', 2],
  'fern-valley': ['coins', 500],
  'fox-hollow': ['endurance', 1],
  'frost-ridge': ['squad_silver', 100],
  heart: ['squad_silver', 100],
  'high-pines': ['coins', 500],
  'mist-pass': ['agility', 2],
  north: ['coins', 500],
  'north-east': ['wisdom', 1],
  'north-west': ['squad_silver', 100],
  'raven-wood': ['coins', 500],
  'silent-grove': ['strength', 1],
  south: ['coins', 500],
  'south-east': ['squad_silver', 100],
  'south-west': ['strength', 1],
  'stone-roots': ['squad_silver', 100],
  'sun-glade': ['squad_silver', 100],
  'watch-pines': ['coins', 500],
};

export const siegeRewardTotals = Object.values(territoryRewards).reduce<Partial<Record<RewardKind, number>>>((total, reward) => {
  if (reward) {
    const [kind, amount] = reward;
    total[kind] = (total[kind] ?? 0) + amount;
  }
  return total;
}, {});
