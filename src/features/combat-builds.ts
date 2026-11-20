import rawSkills from '../../public/data/skills.json';
import shopItems from './shop-data.json';
import { startingAttribute } from '../domain/combat';
import { skillCopy } from './skill-copy';

export const statKeys = ['strength', 'agility', 'wisdom', 'endurance'] as const;
export type StatKey = typeof statKeys[number];
export type Attributes = Record<StatKey, number>;
export const emptyAttributes: Attributes = { strength: 0, agility: 0, wisdom: 0, endurance: 0 };

export const statLabels = {
  strength: ['Сила', 'Strength'],
  agility: ['Ловкость', 'Agility'],
  wisdom: ['Мудрость', 'Wisdom'],
  endurance: ['Выносливость', 'Endurance'],
} as const;

export const combatSkills = rawSkills.map(skill => ({
  ...skill,
  branch: skill.branch as StatKey,
  title: skillCopy[skill.id - 1][0],
  summary: skillCopy[skill.id - 1][1],
}));

export const skillById = new Map(combatSkills.map(skill => [skill.id, skill]));

export const ringCatalog = shopItems.flatMap(item => {
  if (item.category !== 'ring' || !item.tier || !item.required_level || !item.stat) return [];
  return [{
    id: item.id,
    title: item.name_ru,
    attribute: item.stat as Exclude<StatKey, 'endurance'>,
    tier: item.tier,
    bonus: [2, 5, 10][item.tier - 1],
    minLevel: item.required_level,
  }];
});

export type Ring = typeof ringCatalog[number];
export type EquippedRing = { ring: Ring; enchant: number };
export type EquippedSkill = { id: number; level: number };
export type BuildState = {
  level: number;
  budget: number | null;
  points: Attributes;
  buffs: Attributes;
  rings: (EquippedRing | null)[];
  skills: (EquippedSkill | null)[];
};

export type Build = {
  id: string;
  icon: StatKey;
  name: [string, string];
  role: [string, string];
  play: [string, string];
  stats: [number, number, number, number];
  rings: [StatKey, StatKey, StatKey];
  skills: [number, number, number];
  early: number[];
};

export const builds: Build[] = [
  {
    id: 'snowball', icon: 'agility', name: ['Ледяной контроль', 'Frost control'], role: ['Замедление, лечение и защита от взрывного урона', 'Slow, healing and burst protection'],
    play: ['Замедли атаки Снежком и бей в свободную зону. Фазовый сдвиг береги на ответное заклинание или серию. Лечение используй, когда потерял хотя бы столько HP, сколько оно восстановит.', 'Slow incoming attacks with Snowball and hit an open zone. Save Phase Shift for a spell or combo. Heal once you have lost enough health to use it fully.'],
    stats: [0, 30, 30, 40], rings: ['wisdom', 'agility', 'wisdom'], skills: [3, 6, 20], early: [5, 19, 8],
  },
  {
    id: 'reflect', icon: 'strength', name: ['Контрудар', 'Counter fighter'], role: ['Ответ на серии ударов', 'Answer to hit combos'],
    play: ['Включай Статический щит перед серией ударов. Цепи фиксируют блок соперника и помогают бить в незакрытые зоны. Фазовый сдвиг помогает пережить ответную вспышку, а два кольца мудрости дают ману на повторные применения.', 'Cast Static Shield before a combo. Chains hold the opponent’s guard so you can hit an open zone. Phase Shift helps survive burst retaliation, and two Wisdom rings fund repeat casts.'],
    stats: [15, 30, 30, 25], rings: ['strength', 'wisdom', 'wisdom'], skills: [17, 9, 20], early: [12, 5, 13],
  },
  {
    id: 'stun', icon: 'wisdom', name: ['Боевой маг', 'Battle mage'], role: ['Против уклонения и плотного блока', 'Against dodge and tight guard'],
    play: ['Молния проходит сквозь блок и уклонение. Перед применением следи за действиями соперника: на две секунды закроются атака и смена блока. Фазовый сдвиг и Лечение помогают пережить размен.', 'Lightning bypasses guards and dodges. Time the cast carefully, since it locks attacks and guard for two seconds. Phase Shift and Healing keep you alive through trades.'],
    stats: [0, 25, 45, 30], rings: ['wisdom', 'agility', 'wisdom'], skills: [1, 20, 3], early: [7, 14, 5],
  },
  {
    id: 'bastion', icon: 'endurance', name: ['Бастион', 'Bastion'], role: ['Щит и восстановление в длинном бою', 'Shield and recovery for long duels'],
    play: ['Включи Щит из скорлупы и применяй Клык вампира, когда можешь провести серию ударов. Фазовый сдвиг прибереги на сильную серию или ответное заклинание. Мудрость даёт ману на долгий размен.', 'Enable Aegis and use Vampire Fang when you can land a combo. Save Phase Shift for a heavy combo or spell. Wisdom funds a longer exchange.'],
    stats: [12, 0, 24, 64], rings: ['wisdom', 'strength', 'wisdom'], skills: [18, 4, 20], early: [19, 17, 14],
  },
  {
    id: 'dodge', icon: 'agility', name: ['Уклонение и яд', 'Dodge and poison'], role: ['Против частых обычных ударов', 'Against frequent basic attacks'],
    play: ['Используй Споры против соперника, который постоянно атакует. Снежок замедляет соперника, а Лечение компенсирует удары, которые прошли сквозь уклонение. Кольцо мудрости понадобится для повторных применений.', 'Use Spores if your opponent keeps attacking. Snowball slows the opponent, and Healing recovers health after hits that get through your dodge. A Wisdom ring helps you cast more than once.'],
    stats: [0, 54, 22, 24], rings: ['agility', 'wisdom', 'agility'], skills: [5, 3, 6], early: [8, 14, 19],
  },
];

export function requiredAttributes(ids: number[]) {
  const result = { ...emptyAttributes };
  for (const id of ids) {
    const skill = skillById.get(id);
    if (skill) result[skill.branch] = Math.max(result[skill.branch], skill.tier);
  }
  return result;
}

export function totalAttributes(attributes: Attributes) {
  return statKeys.reduce((sum, stat) => sum + attributes[stat], 0);
}

export function activeAttributes(state: BuildState): Attributes {
  const result = { ...state.points };
  for (const stat of statKeys) result[stat] += startingAttribute + state.buffs[stat];
  for (const slot of state.rings) if (slot) result[slot.ring.attribute] += slot.ring.bonus + slot.enchant;
  return result;
}

export function applyBuildPreset(build: Build, state: BuildState): BuildState {
  const budget = state.budget ?? state.level;
  const chosen: number[] = [];
  let points = { ...emptyAttributes };
  if (state.level >= 2) {
    for (const id of [...build.skills, ...build.early]) {
      if (chosen.length === 3) break;
      if (chosen.includes(id)) continue;
      const candidate = requiredAttributes([...chosen, id]);
      if (totalAttributes(candidate) > budget) continue;
      chosen.push(id);
      points = candidate;
    }
  }

  const deficits = build.stats.map((weight, i) => weight * budget / 100 - points[statKeys[i]]);
  for (let remaining = budget - totalAttributes(points); remaining > 0; remaining--) {
    const index = deficits.indexOf(Math.max(...deficits));
    points[statKeys[index]]++;
    deficits[index]--;
  }

  const rings = build.rings.map(attribute => {
    const ring = ringCatalog.filter(ring => ring.attribute === attribute && ring.minLevel <= state.level)
      .sort((a, b) => b.tier - a.tier)[0];
    return ring ? { ring, enchant: Math.min(3, Math.floor((state.level - 5) / 5)) } : null;
  });
  const targetSkillLevel = Math.min(5, 1 + Math.floor(state.level / 5));
  const skills = Array.from({ length: 3 }, (_, slot) =>
    chosen[slot] ? { id: chosen[slot], level: targetSkillLevel } : null);
  return { ...state, points, rings, skills };
}
