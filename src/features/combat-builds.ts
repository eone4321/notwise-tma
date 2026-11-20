import rawSkills from '../../public/data/skills.json';
import shopItems from './shop-data.json';
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

type Build = {
  id: string;
  name: [string, string];
  role: [string, string];
  play: [string, string];
  stats: [number, number, number, number];
  rings: [StatKey, StatKey, StatKey];
  skills: [number, number, number];
};

export const builds: Build[] = [
  {
    id: 'balanced', name: ['Универсал', 'All-rounder'], role: ['Для первых боёв', 'For early fights'],
    play: ['Начни с обычных ударов и используй лечение, когда потеряешь здоровье. Щит помогает пережить серию попаданий, пока учишься менять блок.', 'Start with basic hits and heal after taking damage. Your shield buys time to learn how to switch guards.'],
    stats: [25, 25, 25, 25], rings: ['strength', 'agility', 'wisdom'], skills: [3, 2, 4],
  },
  {
    id: 'strength', name: ['Тяжёлый удар', 'Heavy hitter'], role: ['Сила · быстрый урон', 'Strength · burst'],
    play: ['Включи Мощный удар и бей в открытую зону. Вой берсерка повторяет удары в последнюю зону, поэтому следи за блоком. Огненный шар помогает, когда к цели трудно подобраться.', 'Enable Power Punch and strike an open zone. Berserk Howl repeats attacks in the last zone, so watch the guard. Fireball helps against hard-to-hit targets.'],
    stats: [100, 0, 0, 0], rings: ['strength', 'strength', 'strength'], skills: [2, 13, 11],
  },
  {
    id: 'agility', name: ['Уворотчик', 'Dodger'], role: ['Ловкость · контроль темпа', 'Agility · tempo control'],
    play: ['Замедляй атаки Снежком и береги Уклонение на серию ударов противника. Споры наказывают за активные атаки. Против заклинаний сквозь уклонение держи запас здоровья.', 'Slow incoming attacks with Snowball and save Evada Kedabra for an enemy combo. Spores punish frequent attacks. Keep health in reserve against spells that bypass dodge.'],
    stats: [0, 100, 0, 0], rings: ['agility', 'agility', 'agility'], skills: [5, 8, 6],
  },
  {
    id: 'wisdom', name: ['Крит-маг', 'Crit caster'], role: ['Мудрость · мана и крит', 'Wisdom · mana and crit'],
    play: ['Используй Подсказку духа, чтобы видеть смену блока. Молния проходит сквозь блок и уклонение, а Фазовый сдвиг помогает пережить ответный удар.', 'Use Spirit Guidance to see guard changes. Lightning bypasses guard and dodge, while Phase Shift helps survive retaliation.'],
    stats: [0, 0, 100, 0], rings: ['wisdom', 'wisdom', 'wisdom'], skills: [20, 10, 1],
  },
  {
    id: 'endurance', name: ['Бастион', 'Bastion'], role: ['Выносливость · затяжной бой', 'Endurance · long fights'],
    play: ['Щит снижает входящий урон, Клык вампира возвращает здоровье за попадания. Прибереги Астероид для момента, когда оглушение позволит перехватить инициативу. Кольца мудрости дают ману на защиту.', 'Use Aegis to reduce damage and Vampire Fang to heal on hits. Save Asteroid for a stun that lets you take the initiative. Wisdom rings fund your defense.'],
    stats: [0, 0, 0, 100], rings: ['wisdom', 'strength', 'wisdom'], skills: [18, 4, 16],
  },
  {
    id: 'flurry', name: ['Серия ударов', 'Flurry fighter'], role: ['Сила + ловкость · PvP', 'Strength + agility · PvP'],
    play: ['Включи Мощный удар, а Уклонение оставь на ответную серию. Используй Вой берсерка, пока последняя атакованная зона открыта. Если её закрыли, сначала смени зону.', 'Enable Power Punch and save Evada Kedabra for the counterattack. Use Berserk Howl while the last zone is open. If it is guarded, change zones first.'],
    stats: [55, 45, 0, 0], rings: ['strength', 'agility', 'agility'], skills: [2, 8, 13],
  },
  {
    id: 'stun', name: ['Маг оглушения', 'Stun caster'], role: ['Мудрость + ловкость · PvP', 'Wisdom + agility · PvP'],
    play: ['Оглушение мешает сопернику атаковать, но он по-прежнему может менять блок. Используй это окно для Молнии. Фазовый сдвиг оставь на ответное заклинание.', 'Stun stops enemy attacks, and the enemy can still switch guard. Use that window for Lightning. Save Phase Shift for a counterspell.'],
    stats: [0, 45, 55, 0], rings: ['wisdom', 'agility', 'wisdom'], skills: [7, 20, 1],
  },
  {
    id: 'reflect', name: ['Отражающий боец', 'Counter fighter'], role: ['Сила + выносливость · PvP', 'Strength + endurance · PvP'],
    play: ['Включай Статический щит перед серией противника. Цепи фиксируют и показывают его блок, чтобы ты мог бить в открытую зону. Для щита нужны четыре вложенных очка ловкости.', 'Use Static Shield before an enemy combo. Chains reveal and hold the enemy guard so you can strike an open zone. The shield requires four invested Agility points.'],
    stats: [55, 0, 0, 45], rings: ['strength', 'wisdom', 'strength'], skills: [17, 19, 9],
  },
  {
    id: 'snowball', name: ['Ледяной контроль', 'Frost control'], role: ['Выносливость + мудрость · PvP', 'Endurance + wisdom · PvP'],
    play: ['Снежок замедляет атаки врага, Лечение и Щит из скорлупы помогают пережить размен. Сначала открой навыки ловкости и выносливости, затем вложи остаток в запас HP и маны.', 'Snowball slows enemy attacks, while Healing and Aegis help you survive trades. Unlock Agility and Endurance skills first, then spend the rest on health and mana.'],
    stats: [0, 0, 45, 55], rings: ['wisdom', 'agility', 'wisdom'], skills: [3, 4, 6],
  },
  {
    id: 'raid-cast', name: ['Охотник в рейдах', 'Raid hunter'], role: ['Контроль блока + Молния', 'Guard control + Lightning'],
    play: ['Открой бой Цепями и бей в незакрытые зоны. Молнию используй против цели с высоким уклонением, а Фазовый сдвиг — когда ждёшь ответную серию.', 'Open with Chains and attack unguarded zones. Use Lightning against high-dodge targets and Phase Shift when you expect a counterattack.'],
    stats: [25, 0, 55, 20], rings: ['wisdom', 'strength', 'wisdom'], skills: [17, 20, 1],
  },
  {
    id: 'raid-sustain', name: ['Рейдер с вампиризмом', 'Lifesteal raider'], role: ['Обычные удары · долгий рейд', 'Basic hits · long raids'],
    play: ['Мощный удар усиливает каждое попадание. Включай Клык вампира, когда можешь провести несколько ударов подряд. Держи запас маны на усиление и не трать Вой берсерка в блок.', 'Power Punch strengthens each hit. Use Vampire Fang when you can land several hits in a row. Conserve mana for empowered hits and avoid using Berserk Howl into a guard.'],
    stats: [60, 0, 40, 0], rings: ['strength', 'strength', 'wisdom'], skills: [2, 18, 13],
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

export function presetAttributes(build: Build, level: number, budget: number): Attributes {
  let result = { ...emptyAttributes };
  if (level >= 2) {
    const ids: number[] = [];
    for (const id of build.skills) {
      const candidate = requiredAttributes([...ids, id]);
      if (totalAttributes(candidate) <= budget) {
        ids.push(id);
        result = candidate;
      }
    }
  }
  // Allocate the rest toward the build's proportions without taking away skill prerequisites.
  const deficits = build.stats.map((weight, i) => weight * budget / 100 - result[statKeys[i]]);
  for (let remaining = budget - totalAttributes(result); remaining > 0; remaining--) {
    const index = deficits.indexOf(Math.max(...deficits));
    result[statKeys[index]]++;
    deficits[index]--;
  }
  return result;
}
