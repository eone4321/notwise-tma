import {
  activeAttributes, applyBuildPreset, builds, combatSkills, emptyAttributes, requiredAttributes, ringCatalog,
  statKeys, totalAttributes, type BuildState, type EquippedSkill, type StatKey,
} from './combat-builds';
import { combatant, simulateDuel } from './combat-simulation';

const battlesPerMatchup = 120;
type Change = { kind: 'points'; to: StatKey; from?: StatKey; amount: number }
  | { kind: 'ring'; slot: number; id: string; enchant: number }
  | { kind: 'skill'; slot: number; id: number; previous?: number; level: number };

export type AnalysisResult = ReturnType<typeof analyzeBuild>;

function sample(state: BuildState, opponents: ReturnType<typeof combatant>[], trials: number, phase = 0) {
  const player = combatant(state);
  return opponents.map((opponent, index) => {
    const result = { wins: 0, draws: 0, seconds: 0, manaShort: 0, attempts: 0, blocked: 0, evaded: 0, trials };
    for (let trial = 0; trial < trials; trial++) {
      const seed = (phase + index * 19117 + Math.floor(trial / 2)) * 9973;
      const duel = simulateDuel(player, opponent, seed, trial % 2 === 1);
      if (duel.outcome > 0) result.wins++;
      if (duel.outcome === 0) result.draws++;
      result.seconds += duel.duration;
      result.manaShort += Number(duel.manaShort);
      result.attempts += duel.attempts;
      result.blocked += duel.blocked;
      result.evaded += duel.evaded;
    }
    return result;
  });
}

function summarize(results: ReturnType<typeof sample>) {
  return results.reduce((total, result) => {
    for (const key of Object.keys(result) as (keyof typeof result)[]) total[key] += result[key];
    return total;
  }, { wins: 0, draws: 0, seconds: 0, manaShort: 0, attempts: 0, blocked: 0, evaded: 0, trials: 0 });
}

function candidates(state: BuildState) {
  const result: { state: BuildState; change: Change }[] = [];
  const remaining = (state.budget ?? state.level) - totalAttributes(state.points);
  const current = state.skills.filter((slot): slot is EquippedSkill => !!slot);
  const required = requiredAttributes(current.map(slot => slot.id));
  for (const to of statKeys) {
    if (remaining > 0) {
      const amount = Math.min(remaining, 6);
      result.push({ state: { ...state, points: { ...state.points, [to]: state.points[to] + amount } },
        change: { kind: 'points', to, amount } });
    } else {
      for (const from of statKeys) {
        if (from === to) continue;
        const amount = Math.min(4, state.points[from] - required[from]);
        if (amount <= 0) continue;
        result.push({ state: { ...state, points: { ...state.points, [from]: state.points[from] - amount, [to]: state.points[to] + amount } },
          change: { kind: 'points', to, from, amount } });
      }
    }
  }

  const availableRings = ringCatalog.filter(ring => ring.minLevel <= state.level);
  const attributes = [...new Set(availableRings.map(ring => ring.attribute))];
  state.rings.forEach((old, slot) => {
    if (slot !== state.rings.findIndex(item => old?.ring.id === item?.ring.id && old?.enchant === item?.enchant)) return;
    for (const attr of attributes) {
      const ring = availableRings.filter(item => item.attribute === attr).at(-1);
      if (!ring || ring.id === old?.ring.id) continue;
      const enchant = old?.enchant ?? 0;
      result.push({ state: { ...state, rings: state.rings.map((item, index) => index === slot ? { ring, enchant } : item) },
        change: { kind: 'ring', slot, id: ring.id, enchant } });
    }
  });

  if (state.level >= 2) {
    const available = combatSkills.filter(skill =>
      skill.tier <= state.points[skill.branch] && !current.some(item => item.id === skill.id));
    const empty = state.skills.indexOf(null);
    state.skills.forEach((old, slot) => {
      if (empty >= 0 && slot !== empty) return;
      for (const skill of available) {
        const level = old?.level ?? 1;
        result.push({ state: { ...state, skills: state.skills.map((item, index) => index === slot ? { id: skill.id, level } : item) },
          change: { kind: 'skill', slot, id: skill.id, previous: old?.id, level } });
      }
      if (old && old.level < 21) {
        const level = Math.min(old.level + 3, 21);
        result.push({ state: { ...state, skills: state.skills.map((item, index) => index === slot ? { ...old, level } : item) },
          change: { kind: 'skill', slot, id: old.id, previous: old.id, level } });
      }
    });
  }
  return result;
}

export function analyzeBuild(state: BuildState) {
  const sortedLevels = state.skills.flatMap(slot => slot ? [slot.level] : []).sort((a, b) => a - b);
  const skillLevel = sortedLevels[Math.floor(sortedLevels.length / 2)];
  const enchants = state.rings.flatMap(slot => slot ? [slot.enchant] : []).sort((a, b) => a - b);
  const enchant = enchants[Math.floor(enchants.length / 2)];
  const opponents = builds.map(template => {
    const preset = applyBuildPreset(template, { ...state, buffs: emptyAttributes });
    if (skillLevel !== undefined) preset.skills = preset.skills.map(slot => slot && { ...slot, level: skillLevel });
    if (enchant !== undefined) preset.rings = preset.rings.map(slot => slot && { ...slot, enchant });
    return combatant(preset);
  });

  const matchups = sample(state, opponents, battlesPerMatchup, 2000);
  const baseline = summarize(matchups);
  const shortlisted = candidates(state).map(candidate => ({
    ...candidate, rank: summarize(sample(candidate.state, opponents, 18)).wins,
  })).sort((a, b) => b.rank - a.rank).slice(0, 5);
  const recommendations = shortlisted.map(candidate => {
    const result = summarize(sample(candidate.state, opponents, battlesPerMatchup, 2000));
    return { change: candidate.change, gain: (result.wins - baseline.wins) / baseline.trials * 100, wins: result.wins };
  }).filter(candidate => candidate.gain >= 4).sort((a, b) => b.gain - a.gain).slice(0, 2);

  return {
    baseline,
    matchups: matchups.map((result, i) => ({ ...result, id: builds[i].id })),
    recommendations,
    overCap: (['agility', 'wisdom'] as const).filter(stat => activeAttributes(state)[stat] > 100),
    skillLevel,
    enchant,
  };
}
