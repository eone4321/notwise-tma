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
  presetId?: string;
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
  signature: number;
  name: [string, string];
  role: [string, string];
  play: [string, string];
  tradeoff: [string, string];
  stats: [number, number, number, number];
  rings: [StatKey, StatKey, StatKey];
  skills: [number, number, number];
  early: number[];
};

export const builds: Build[] = [
  {
    id: 'snowball', icon: 'agility', signature: 6, name: ['Ледяной контроль', 'Frost control'], role: ['Замедление, лечение и защита от взрывного урона', 'Slow, healing and burst protection'],
    play: ['Замедли атаки Снежком и бей в свободную зону. Фазовый сдвиг береги на ответное заклинание или серию. Лечение используй, когда потерял хотя бы столько HP, сколько оно восстановит.', 'Slow incoming attacks with Snowball and hit an open zone. Save Phase Shift for a spell or combo. Heal once you have lost enough health to use it fully.'],
    tradeoff: ['Много маны уходит на Снежок и Фазовый сдвиг. Если соперник редко бьёт, часть замедления пропадает впустую.', 'Snowball and Phase Shift eat through mana. Against a cautious opponent, much of the slowdown goes unused.'],
    stats: [0, 30, 30, 40], rings: ['wisdom', 'agility', 'wisdom'], skills: [3, 6, 20], early: [5, 19, 8],
  },
  {
    id: 'reflect', icon: 'strength', signature: 9, name: ['Контрудар', 'Counter fighter'], role: ['Ответ на серии ударов', 'Answer to hit combos'],
    play: ['Включай Статический щит перед серией ударов. Цепи фиксируют блок соперника и помогают бить в незакрытые зоны. Фазовый сдвиг помогает пережить ответную вспышку, а два кольца мудрости дают ману на повторные применения.', 'Cast Static Shield before a combo. Chains hold the opponent’s guard so you can hit an open zone. Phase Shift helps survive burst retaliation, and two Wisdom rings fund repeat casts.'],
    tradeoff: ['Терпеливый соперник может переждать отражение. Держи ману для Цепей, если нужно самому навязать размен.', 'A patient opponent can wait out the reflection. Keep mana for Chains when you need to force a trade.'],
    stats: [15, 30, 30, 25], rings: ['strength', 'wisdom', 'wisdom'], skills: [17, 9, 20], early: [12, 5, 13],
  },
  {
    id: 'stun', icon: 'wisdom', signature: 1, name: ['Боевой маг', 'Battle mage'], role: ['Против уклонения и плотного блока', 'Against dodge and tight guard'],
    play: ['Молния проходит сквозь блок и уклонение. Перед применением следи за действиями соперника: на две секунды закроются атака и смена блока. Фазовый сдвиг и Лечение помогают пережить размен.', 'Lightning bypasses guards and dodges. Time the cast carefully, since it locks attacks and guard for two seconds. Phase Shift and Healing keep you alive through trades.'],
    tradeoff: ['Молния тратит 125 маны. Дождись окончания вражеского Фазового сдвига, чтобы не потерять заклинание.', 'Lightning costs 125 mana. Wait for the enemy’s Phase Shift to expire before committing it.'],
    stats: [0, 25, 45, 30], rings: ['wisdom', 'agility', 'wisdom'], skills: [1, 20, 3], early: [7, 14, 5],
  },
  {
    id: 'bastion', icon: 'endurance', signature: 4, name: ['Бастион', 'Bastion'], role: ['Щит и восстановление в длинном бою', 'Shield and recovery for long duels'],
    play: ['Включи Щит из скорлупы и применяй Клык вампира, когда можешь провести серию ударов. Фазовый сдвиг прибереги на сильную серию или ответное заклинание. Мудрость даёт ману на долгий размен.', 'Enable Aegis and use Vampire Fang when you can land a combo. Save Phase Shift for a heavy combo or spell. Wisdom funds a longer exchange.'],
    tradeoff: ['Клык лечит только за прошедший урон. Против высокой ловкости лучше дождаться удобного окна для серии.', 'Fang heals only from landed damage. Against high Agility, wait for a good opening before casting.'],
    stats: [12, 0, 24, 64], rings: ['wisdom', 'strength', 'wisdom'], skills: [18, 4, 20], early: [19, 17, 14],
  },
  {
    id: 'dodge', icon: 'agility', signature: 5, name: ['Уклонение и яд', 'Dodge and poison'], role: ['Против частых обычных ударов', 'Against frequent basic attacks'],
    play: ['Используй Споры против соперника, который постоянно атакует. Снежок замедляет соперника, а Лечение компенсирует удары, которые прошли сквозь уклонение. Кольцо мудрости понадобится для повторных применений.', 'Use Spores if your opponent keeps attacking. Snowball slows the opponent, and Healing recovers health after hits that get through your dodge. A Wisdom ring helps you cast more than once.'],
    tradeoff: ['Молния и Астероид обходят уклонение, а соперник может переждать яд, если перестанет атаковать.', 'Lightning and Asteroid bypass dodge, and an opponent can wait out poison by holding their attacks.'],
    stats: [0, 54, 22, 24], rings: ['agility', 'wisdom', 'agility'], skills: [5, 3, 6], early: [8, 14, 19],
  },
  {
    id: 'assault', icon: 'strength', signature: 13, name: ['Натиск', 'Relentless assault'],
    role: ['Серия в открытую зону', 'Combos into an open zone'],
    play: ['Включи Мощный удар. Зафиксируй блок Цепями, ударь в открытую зону и отправь туда же серию Воем берсерка. Кольца силы повышают урон каждого прошедшего удара.', 'Enable Power Punch. Fix the guard with Chains, hit an open zone, then send the Berserk Howl flurry into that same zone. Strength rings increase each landed hit.'],
    tradeoff: ['Если Цепи кончились, соперник может перекрыть последнюю зону и погасить всю серию. Высокая ловкость также снижает число попаданий.', 'Once Chains expire, the enemy can cover the last zone and stop the entire flurry. High Agility also reduces landed hits.'],
    stats: [52, 10, 13, 25], rings: ['strength', 'strength', 'wisdom'], skills: [2, 17, 13], early: [12, 19, 14],
  },
  {
    id: 'fire', icon: 'strength', signature: 11, name: ['Поджигатель', 'Fire caster'],
    role: ['Урон со временем и ответ при низком HP', 'Damage over time and a low-health payoff'],
    play: ['Запускай Огненный шар, когда соперник открыт для урона. Отчаянный бросок оставь до потери части здоровья. Фазовый сдвиг помогает пережить опасный момент и дождаться следующего броска.', 'Cast Fireball when the enemy is vulnerable. Save Desperate Throw until you have lost some health. Phase Shift helps survive the danger window and reach the next throw.'],
    tradeoff: ['Отчаянный бросок тратит собственное HP. Если нажать его слишком рано, множитель будет слабым.', 'Desperate Throw spends your own HP. Casting too early wastes much of the multiplier.'],
    stats: [10, 10, 15, 65], rings: ['agility', 'agility', 'wisdom'], skills: [11, 12, 20], early: [14, 2, 19],
  },
  {
    id: 'cast-control', icon: 'wisdom', signature: 16, name: ['Двойное оглушение', 'Double stun'],
    role: ['Оглушение и замедление против частых атак', 'Stuns and slow against frequent attacks'],
    play: ['Чередуй Астероид и Оглушающий выстрел, чтобы их оглушения не перекрывались. Снежок замедляет атаки между оглушениями. Во время контроля бей в открытую зону: оглушённая сова всё ещё может менять блок.', 'Alternate Asteroid and Stunning Shot so the stuns do not overlap. Snowball slows attacks between stuns. Hit open zones during control: a stunned owl can still change guard.'],
    tradeoff: ['Два навыка пятой ступени стоят по 125 маны. Если бой затянется, часть маны нужно оставить на контроль.', 'Both tier-five spells cost 125 mana. In a long fight, keep some mana in reserve for control.'],
    stats: [0, 45, 15, 40], rings: ['agility', 'wisdom', 'wisdom'], skills: [16, 7, 6], early: [14, 19, 5],
  },
  {
    id: 'scout', icon: 'wisdom', signature: 10, name: ['Чтение блока', 'Guard reader'],
    role: ['Подсказка блока и повторные удары', 'Guard hints and bonus hits'],
    play: ['Включи Подсказку духа и бей в другую зону, когда видишь блок. Удар с эхом включай перед серией, а Вой берсерка используй сразу после попадания в открытую зону.', 'Enable Spirit Guidance and use a different zone when a hint shows the guard. Cast Echoing Blow before a combo, and use Berserk Howl right after hitting an open zone.'],
    tradeoff: ['Соперник, который подолгу держит один блок, даёт мало новых подсказок. Частые смены, наоборот, расходуют ману.', 'An opponent who holds one guard gives you fewer new hints. Frequent changes, on the other hand, drain mana.'],
    stats: [28, 15, 40, 17], rings: ['strength', 'wisdom', 'wisdom'], skills: [10, 14, 13], early: [12, 7, 19],
  },
  {
    id: 'iron-guard', icon: 'endurance', signature: 19, name: ['Железная защита', 'Iron guard'],
    role: ['Ответ на яд, оглушение и замедление', 'An answer to poison, stuns and slowdown'],
    play: ['Включи Железную волю и Щит из скорлупы перед разменом. Когда урон всё же прошёл, используй Лечение после потери достаточного количества HP. Кольца ловкости снижают число обычных попаданий по тебе.', 'Toggle Iron Will and Aegis before trading damage. When damage gets through, heal once you have lost enough HP. Agility rings reduce the number of basic hits you take.'],
    tradeoff: ['Обе пассивки расходуют ману при срабатывании. Против прямого урона без контроля отключи Железную волю и сохрани ману на щит.', 'Both passives spend mana on triggers. Against direct damage without control, disable Iron Will and save mana for Aegis.'],
    stats: [10, 10, 15, 65], rings: ['agility', 'agility', 'wisdom'], skills: [19, 4, 3], early: [5, 17, 12],
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

export function skillAvailable(id: number, { level, points }: BuildState) {
  const skill = skillById.get(id);
  return !!skill && level >= 2 && points[skill.branch] >= skill.tier;
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
  return { ...state, presetId: build.id, points, rings, skills };
}
