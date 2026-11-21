import { battleStats, skillMana } from '../domain/combat';
import {
  attributeBudget, activeAttributes, applyBuildPreset, builds, combatSkills, emptyAttributes, ringCatalog, skillAvailable,
  statKeys, totalAttributes, validateBuild, type BuildState, type EquippedRing, type EquippedSkill,
} from './combat-builds';
import { combatant, simulateDuel } from './combat-simulation';

const battlesPerMatchup = 60;
const populationSize = 1000;
const medianTrials = 200;
const practiceProfiles = builds.filter(build => ['assault', 'stun', 'bastion', 'dodge'].includes(build.id));

function makePrng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generatePopulationBuild(level: number, budget: number, rand: () => number): BuildState {
  const isMetaCohort = rand() < 0.2;
  if (isMetaCohort) {
    const preset = builds[Math.floor(rand() * builds.length)];
    const base = applyBuildPreset(preset, {
      level,
      budget,
      points: emptyAttributes,
      buffs: emptyAttributes,
      rings: [null, null, null],
      skills: [null, null, null],
    });
    // Even meta players don't always have 3 maxed rings
    const rings: (EquippedRing | null)[] = base.rings.map(slot => {
      if (!slot) return null;
      if (rand() < 0.25) return null;
      const enchant = Math.min(7, Math.max(0, slot.enchant + Math.floor(rand() * 3) - 1));
      return { ...slot, enchant };
    });
    return validateBuild({ ...base, rings });
  }

  // 80% typical player cohort: organic stat splits, rare rings, partial skill upgrades
  const weights = statKeys.map(() => 0.15 + rand() * 1.4);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const points = { ...emptyAttributes };
  // Some typical players leave 0..2 points unspent or spread broadly
  const usableBudget = Math.max(0, budget - (rand() < 0.2 ? Math.floor(rand() * 3) : 0));
  let allocated = 0;
  for (let i = 0; i < statKeys.length; i++) {
    const share = i === statKeys.length - 1
      ? Math.max(0, usableBudget - allocated)
      : Math.floor((usableBudget * weights[i]) / weightSum);
    points[statKeys[i]] = share;
    allocated += share;
  }

  // Rings are rare in real play
  const rings: (EquippedRing | null)[] = [null, null, null];
  if (level >= 5) {
    const roll = rand();
    let ringCount = 0;
    if (level < 10) {
      ringCount = roll < 0.72 ? 0 : 1;
    } else if (level < 20) {
      ringCount = roll < 0.48 ? 0 : roll < 0.84 ? 1 : roll < 0.97 ? 2 : 3;
    } else {
      ringCount = roll < 0.25 ? 0 : roll < 0.68 ? 1 : roll < 0.90 ? 2 : 3;
    }
    const eligibleRings = ringCatalog.filter(r => r.minLevel <= level);
    for (let s = 0; s < ringCount && eligibleRings.length > 0; s++) {
      // Lower tier rings are much more common than tier-3 golden rings
      const pool = eligibleRings.filter(r => r.tier === 1 || (r.tier === 2 && rand() < 0.45) || (r.tier === 3 && rand() < 0.18));
      const pickPool = pool.length ? pool : eligibleRings;
      const ring = pickPool[Math.floor(rand() * pickPool.length)];
      const maxEnc = level < 10 ? 2 : level < 20 ? 3 : 5;
      const enchant = Math.floor(rand() * (maxEnc + 1));
      rings[s] = { ring, enchant };
    }
  }

  const baseState: BuildState = {
    level,
    budget,
    points,
    buffs: emptyAttributes,
    rings,
    skills: [null, null, null],
  };

  const skills: (EquippedSkill | null)[] = [null, null, null];
  if (level >= 2) {
    const unlocked = combatSkills.filter(sk => skillAvailable(sk.id, baseState));
    const maxSlots = rand() < 0.2 ? 1 : rand() < 0.55 ? 2 : 3;
    const chosenIds = new Set<number>();
    const maxSkillLvl = Math.max(1, Math.min(21, 1 + Math.floor(level / 5)));
    for (let s = 0; s < maxSlots && unlocked.length > 0; s++) {
      const candidates = unlocked.filter(sk => !chosenIds.has(sk.id));
      if (!candidates.length) break;
      const picked = candidates[Math.floor(rand() * candidates.length)];
      chosenIds.add(picked.id);
      skills[s] = { id: picked.id, level: 1 + Math.floor(rand() * maxSkillLvl) };
    }
  }

  return validateBuild({ ...baseState, skills });
}

export function reviewBuild(state: BuildState) {
  const attributes = activeAttributes(state);
  const freePoints = attributeBudget(state) - totalAttributes(state.points);
  const filled = new Set(state.skills.flatMap(slot => slot ? [slot.id] : []));
  const equipped = combatSkills.filter(skill => filled.has(skill.id));
  const active = equipped.filter(skill => skill.type !== 'passive');
  const mana = battleStats(state.level, attributes.strength, attributes.agility, attributes.wisdom, attributes.endurance).mana;
  const rotationCost = active.reduce((sum, skill) => sum + skillMana(skill.tier, false), 0);
  const ringSlots = ringCatalog.some(ring => ring.minLevel <= state.level) ? state.rings.filter(slot => !slot).length : 0;
  const availableSkills = combatSkills.filter(skill => skillAvailable(skill.id, state) && !filled.has(skill.id));
  const skillSlots = Math.min(state.skills.length - filled.size, availableSkills.length);
  const overCap = (['agility', 'wisdom'] as const).filter(stat => attributes[stat] > 100);
  const spareAgility = Math.min(state.points.agility, attributes.agility - 100);
  const agilityRequirement = equipped.filter(skill => skill.branch === 'agility').reduce((tier, skill) => Math.max(tier, skill.tier), 0);
  const movableAgility = Math.max(0, Math.min(spareAgility, state.points.agility - agilityRequirement));
  return {
    freePoints, ringSlots, skillSlots, overCap, movableAgility,
    mana, rotationCost, hasPassives: active.length < equipped.length,
    flurryWithoutHint: filled.has(13) && !filled.has(17) && !filled.has(10),
  };
}

export type PracticeResult = ReturnType<typeof analyzeBuild>;

export function practiceKey(state: BuildState) {
  return state.level + ':' + attributeBudget(state);
}

export function analyzeBuild(state: BuildState) {
  const player = combatant(state);
  const budget = attributeBudget(state);
  const rand = makePrng(state.level * 7919 + budget * 131 + 17);

  // Build 1,000 realistic player combinations (80% typical + 20% meta) and find the median opponent.
  const anchors = practiceProfiles.map(template =>
    combatant(applyBuildPreset(template, { ...state, buffs: emptyAttributes })),
  );
  const scored: { build: BuildState; score: number }[] = [];
  for (let i = 0; i < populationSize; i++) {
    const candidate = generatePopulationBuild(state.level, budget, rand);
    const fighter = combatant(candidate);
    let score = 0;
    for (let a = 0; a < anchors.length; a++) {
      const duel = simulateDuel(fighter, anchors[a], 1000 + i * 37 + a * 11, (i + a) % 2 === 1);
      score += duel.outcome > 0 ? 1 : duel.outcome === 0 ? 0.5 : 0;
    }
    scored.push({ build: candidate, score });
  }
  scored.sort((a, b) => a.score - b.score);
  const medianBuild = scored[Math.floor(scored.length / 2)].build;
  const medianFighter = combatant(medianBuild);

  let medianWins = 0;
  let medianDraws = 0;
  for (let trial = 0; trial < medianTrials; trial++) {
    const seed = (5000 + state.level * 4099 + Math.floor(trial / 2)) * 7919;
    const duel = simulateDuel(player, medianFighter, seed, trial % 2 === 1);
    if (duel.outcome > 0) medianWins++;
    if (duel.outcome === 0) medianDraws++;
  }

  const matchups = anchors.map((opponent, index) => {
    const result = { id: practiceProfiles[index].id, wins: 0, draws: 0, trials: battlesPerMatchup };
    for (let trial = 0; trial < battlesPerMatchup; trial++) {
      const seed = (2000 + index * 19117 + Math.floor(trial / 2)) * 9973;
      const duel = simulateDuel(player, opponent, seed, trial % 2 === 1);
      if (duel.outcome > 0) result.wins++;
      if (duel.outcome === 0) result.draws++;
    }
    return result;
  });

  const medianRings = medianBuild.rings.filter((r): r is EquippedRing => r !== null);
  const medianSkillSlots = medianBuild.skills.filter((s): s is EquippedSkill => s !== null);
  const medianSkillLvl = medianSkillSlots.length
    ? Math.round(medianSkillSlots.reduce((sum, s) => sum + s.level, 0) / medianSkillSlots.length)
    : 0;
  const medianEnchant = medianRings.length
    ? Math.round(medianRings.reduce((sum, r) => sum + r.enchant, 0) / medianRings.length)
    : 0;

  return {
    key: practiceKey(state),
    matchups,
    median: {
      wins: medianWins,
      draws: medianDraws,
      trials: medianTrials,
      population: populationSize,
      ringsCount: medianRings.length,
      enchant: medianEnchant,
      skillLevel: medianSkillLvl,
    },
    skillLevel: medianSkillLvl,
    enchant: medianEnchant,
  };
}
