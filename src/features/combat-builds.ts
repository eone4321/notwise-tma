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
    play: ['Замедли атаки Snowball и бей в свободную зону. Phase Shift береги на ответное заклинание или серию. Healing используй, когда потерял хотя бы столько HP, сколько оно восстановит.', 'Slow incoming attacks with Snowball and hit an open zone. Save Phase Shift for a spell or combo. Heal once you have lost enough health to use it fully.'],
    tradeoff: ['Много маны уходит на Snowball и Phase Shift. Если соперник редко бьёт, часть замедления пропадает впустую.', 'Snowball and Phase Shift eat through mana. Against a cautious opponent, much of the slowdown goes unused.'],
    stats: [0, 30, 30, 40], rings: ['wisdom', 'agility', 'wisdom'], skills: [3, 6, 20], early: [5, 19, 8],
  },
  {
    id: 'reflect', icon: 'strength', signature: 9, name: ['Контрудар', 'Counter fighter'], role: ['Ответ на серии ударов', 'Answer to hit combos'],
    play: ['Включай Static Shield перед серией ударов. Crippling Chains фиксируют блок соперника и помогают бить в незакрытые зоны. Phase Shift помогает пережить ответную вспышку, а два кольца мудрости дают ману на повторные применения.', 'Cast Static Shield before a combo. Chains hold the opponent’s guard so you can hit an open zone. Phase Shift helps survive burst retaliation, and two Wisdom rings fund repeat casts.'],
    tradeoff: ['Терпеливый соперник может переждать отражение. Держи ману для Crippling Chains, если нужно самому навязать размен.', 'A patient opponent can wait out the reflection. Keep mana for Chains when you need to force a trade.'],
    stats: [15, 30, 30, 25], rings: ['strength', 'wisdom', 'wisdom'], skills: [17, 9, 20], early: [12, 5, 13],
  },
  {
    id: 'stun', icon: 'wisdom', signature: 1, name: ['Боевой маг', 'Battle mage'], role: ['Против уклонения и плотного блока', 'Against dodge and tight guard'],
    play: ['Сначала включай Phase Shift для защиты, затем бей Lightning сквозь блок и уклонение — на две секунды закроются атака и смена блока. Healing держи на просадку HP.', 'Open with Phase Shift for safety, then fire Lightning through guard and dodge (locks attacks and guard for two seconds). Keep Healing for mid-duel drops.'],
    tradeoff: ['Lightning тратит 125 маны. Дождись окончания вражеского Phase Shift, чтобы не потерять заклинание.', 'Lightning costs 125 mana. Wait for the enemy’s Phase Shift to expire before committing it.'],
    stats: [0, 35, 35, 30], rings: ['wisdom', 'agility', 'wisdom'], skills: [20, 1, 3], early: [7, 14, 5],
  },
  {
    id: 'bastion', icon: 'endurance', signature: 4, name: ['Бастион', 'Bastion'], role: ['Щит и восстановление в длинном бою', 'Shield and recovery for long duels'],
    play: ['Включи Nutshell Aegis и применяй Vampire Fang, когда можешь провести серию ударов. Phase Shift прибереги на сильную серию или ответное заклинание. Ловкость снижает урон от быстрых атак, а мудрость даёт ману на долгий размен.', 'Enable Aegis and use Vampire Fang when you can land a combo. Save Phase Shift for a heavy combo or spell. Agility reduces incoming hits, and Wisdom funds a longer exchange.'],
    tradeoff: ['Клык лечит только за прошедший урон. Против высокой ловкости лучше дождаться удобного окна для серии.', 'Fang heals only from landed damage. Against high Agility, wait for a good opening before casting.'],
    stats: [0, 22, 24, 54], rings: ['wisdom', 'agility', 'wisdom'], skills: [18, 4, 20], early: [19, 17, 14],
  },
  {
    id: 'dodge', icon: 'agility', signature: 5, name: ['Уклонение и яд', 'Dodge and poison'], role: ['Против частых обычных ударов', 'Against frequent basic attacks'],
    play: ['Накидывай Toxic Spores на активного соперника и замедляй его Snowball. Phase Shift страхует от Lightning и Asteroid, которые обходят уклонение.', 'Apply Spores against aggressive attackers and slow them with Snowball. Phase Shift protects against Lightning and Asteroid that bypass dodge.'],
    tradeoff: ['Lightning и Asteroid обходят уклонение, а соперник может переждать яд, если перестанет атаковать.', 'Lightning and Asteroid bypass dodge, and an opponent can wait out poison by holding their attacks.'],
    stats: [0, 42, 28, 30], rings: ['agility', 'wisdom', 'wisdom'], skills: [5, 6, 20], early: [5, 8, 19],
  },
  {
    id: 'assault', icon: 'strength', signature: 13, name: ['Натиск', 'Relentless assault'],
    role: ['Серия в открытую зону', 'Combos into an open zone'],
    play: ['Зафиксируй блок Crippling Chains, перекрой окно Phase Shift и бей в открытую зону серией Berserk Howl. Кольца и баланс статов дают крит и ману на повторные серии.', 'Lock guard with Chains, cover trades with Phase Shift, then trigger Berserk Howl into the open zone.'],
    tradeoff: ['Если Crippling Chains кончились, соперник может перекрыть последнюю зону и погасить всю серию. На 40+ уровне высокая ловкость цели тоже снижает число попаданий.', 'Once Chains expire, the enemy can cover the last zone and stop the entire flurry. High Agility at level 40+ also reduces landed hits.'],
    stats: [25, 25, 25, 25], rings: ['strength', 'wisdom', 'agility'], skills: [17, 20, 13], early: [17, 13, 2],
  },
  {
    id: 'fire', icon: 'strength', signature: 11, name: ['Поджигатель', 'Fire caster'],
    role: ['Защита сдвигом, поджог и замедление', 'Phase protection, burn and slow'],
    play: ['Прикройся Phase Shift, накладывай Fireball и сбивай темп соперника Snowball — горение тикает стабильно даже под осторожный блок.', 'Open with Phase Shift, apply Fireball burn and slow the opponent with Snowball for steady damage through defensive guards.'],
    tradeoff: ['Мало прямого исцеления — важно не пропускать затяжные серии врага без Snowball и Phase Shift.', 'Low direct healing — avoid trading into full enemy combos without Snowball and Phase Shift ready.'],
    stats: [0, 34, 34, 32], rings: ['wisdom', 'agility', 'wisdom'], skills: [20, 11, 6], early: [14, 19, 6],
  },
  {
    id: 'cast-control', icon: 'wisdom', signature: 16, name: ['Оглушение и холод', 'Stun and frost'],
    role: ['Тяжёлый стан, замедление и отхил', 'Heavy stun, slow and sustain'],
    play: ['Открывайся Asteroid для пробития блока и уклонения, замедляй атаки Snowball и восстанавливай HP Healing.', 'Open with Asteroid to bypass guard and dodge, slow attacks with Snowball and sustain with Healing.'],
    tradeoff: ['Asteroid стоит 125 маны и закрывает действия на 2 секунды — не кастуй его в чужой Phase Shift.', 'Asteroid costs 125 mana and locks actions for 2 seconds — wait out enemy Phase Shift first.'],
    stats: [0, 35, 35, 30], rings: ['agility', 'wisdom', 'wisdom'], skills: [16, 6, 3], early: [14, 6, 3],
  },
  {
    id: 'scout', icon: 'wisdom', signature: 10, name: ['Чтение блока', 'Guard reader'],
    role: ['Подсказка блока и повторный урон', 'Guard hints and echo hits'],
    play: ['Spirit Guidance открывает безопасную зону удара. Echoing Blow удваивает серию попаданий, а Phase Shift страхует от ответного прорыва.', 'Spirit Guidance reveals open zones, Echoing Blow amplifies landed combos, and Phase Shift shields against counter-bursts.'],
    tradeoff: ['Соперник, который подолгу держит один блок, даёт мало новых подсказок. Частые смены, наоборот, расходуют ману.', 'An opponent who holds one guard gives you fewer new hints. Frequent changes, on the other hand, drain mana.'],
    stats: [24, 24, 28, 24], rings: ['strength', 'wisdom', 'wisdom'], skills: [10, 14, 20], early: [12, 10, 19],
  },
  {
    id: 'iron-guard', icon: 'endurance', signature: 19, name: ['Железная защита', 'Iron guard'],
    role: ['Ответ на яд, оглушение и замедление', 'An answer to poison, stuns and slowdown'],
    play: ['Включи Iron Will и Nutshell Aegis перед разменом. Когда урон всё же прошёл, используй Healing после потери достаточного количества HP. Ловкость и кольца снижают число обычных попаданий по тебе.', 'Toggle Iron Will and Aegis before trading damage. When damage gets through, heal once you have lost enough HP. Agility and rings reduce the number of basic hits you take.'],
    tradeoff: ['Обе пассивки расходуют ману при срабатывании. Против прямого урона без контроля отключи Iron Will и сохрани ману на щит.', 'Both passives spend mana on triggers. Against direct damage without control, disable Iron Will and save mana for Aegis.'],
    stats: [0, 34, 24, 42], rings: ['agility', 'agility', 'wisdom'], skills: [19, 4, 3], early: [5, 17, 12],
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

// The client receives the actual balance from the server. These defaults
// match the level 2 example and the captured level 12 profile.
export function attributeBudget({ budget, level }: Pick<BuildState, 'budget' | 'level'>) {
  return budget ?? (level >= 2 ? level + 3 : 0);
}

export function validateBuild(state: BuildState): BuildState {
  const points = { ...state.points };
  let excess = totalAttributes(points) - attributeBudget(state);
  for (const stat of [...statKeys].reverse()) {
    if (excess <= 0) break;
    const refund = Math.min(points[stat], excess);
    points[stat] -= refund;
    excess -= refund;
  }
  const next = { ...state, points };
  return {
    ...next,
    rings: next.rings.map(slot => slot && slot.ring.minLevel <= next.level ? slot : null),
    skills: next.skills.map(slot => slot && skillAvailable(slot.id, next) ? slot : null),
  };
}

function writeVarint(out: number[], value: number) {
  let v = Math.max(0, Math.floor(value));
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
}

function readVarint(bytes: Uint8Array, offset: { i: number }): number | null {
  let result = 0;
  let shift = 0;
  while (offset.i < bytes.length && shift < 28) {
    const byte = bytes[offset.i++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return result;
    shift += 7;
  }
  return null;
}

/** Encode a build into a compact Telegram startapp-safe token (`b_...`). */
export function encodeBuildCode(state: BuildState): string {
  const bytes: number[] = [1];
  writeVarint(bytes, state.level);
  writeVarint(bytes, state.budget === null ? 0 : state.budget + 1);
  for (const stat of statKeys) writeVarint(bytes, state.points[stat]);
  const hasBuffs = totalAttributes(state.buffs) > 0;
  bytes.push(hasBuffs ? 1 : 0);
  if (hasBuffs) for (const stat of statKeys) writeVarint(bytes, state.buffs[stat]);
  for (const slot of state.rings) {
    if (!slot) { bytes.push(0); continue; }
    const idx = ringCatalog.findIndex(item => item.id === slot.ring.id);
    if (idx < 0) bytes.push(0);
    else bytes.push(idx + 1, Math.min(20, Math.max(0, slot.enchant)));
  }
  for (const slot of state.skills) {
    if (!slot) { bytes.push(0); continue; }
    bytes.push(slot.id, Math.min(21, Math.max(1, slot.level)));
  }
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return 'b_' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a shared build token (`b_...`) back into a validated BuildState. */
export function decodeBuildCode(code: string, maxLevel = 150): BuildState | null {
  if (!/^b_[A-Za-z0-9_-]{6,80}$/.test(code)) return null;
  try {
    const base64 = code.slice(2).replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(pad);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    const cur = { i: 0 };
    if (bytes[cur.i++] !== 1) return null;

    const level = readVarint(bytes, cur);
    const budgetRaw = readVarint(bytes, cur);
    if (!level || level < 1 || level > maxLevel || budgetRaw === null || budgetRaw > 1000) return null;
    const budget = budgetRaw === 0 ? null : budgetRaw - 1;

    const points = { ...emptyAttributes };
    for (const stat of statKeys) {
      const value = readVarint(bytes, cur);
      if (value === null || value > 999) return null;
      points[stat] = value;
    }

    const buffs = { ...emptyAttributes };
    const hasBuffs = bytes[cur.i++];
    if (hasBuffs !== 0 && hasBuffs !== 1) return null;
    if (hasBuffs === 1) {
      for (const stat of statKeys) {
        const value = readVarint(bytes, cur);
        if (value === null || value > 999) return null;
        buffs[stat] = value;
      }
    }

    const rings: (EquippedRing | null)[] = [null, null, null];
    for (let s = 0; s < 3; s++) {
      const idx = bytes[cur.i++];
      if (idx === undefined) return null;
      if (idx === 0) continue;
      const ring = ringCatalog[idx - 1];
      const enchant = bytes[cur.i++];
      if (!ring || enchant === undefined || enchant > 20) return null;
      rings[s] = { ring, enchant };
    }

    const skills: (EquippedSkill | null)[] = [null, null, null];
    const used = new Set<number>();
    for (let s = 0; s < 3; s++) {
      const id = bytes[cur.i++];
      if (id === undefined) return null;
      if (id === 0) continue;
      const skillLevel = bytes[cur.i++];
      if (!skillById.has(id) || used.has(id) || !skillLevel || skillLevel < 1 || skillLevel > 21) return null;
      used.add(id);
      skills[s] = { id, level: skillLevel };
    }

    return validateBuild({ level, budget, points, buffs, rings, skills });
  } catch {
    return null;
  }
}

export function applyBuildPreset(build: Build, state: BuildState): BuildState {
  const budget = attributeBudget(state);
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
