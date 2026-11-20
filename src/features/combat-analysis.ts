import { battleStats, skillMana } from '../domain/combat';
import {
  activeAttributes, applyBuildPreset, builds, combatSkills, emptyAttributes, ringCatalog, skillAvailable,
  totalAttributes, type BuildState,
} from './combat-builds';
import { combatant, simulateDuel } from './combat-simulation';

const battlesPerMatchup = 80;
const practiceProfiles = builds.filter(build => ['assault', 'stun', 'bastion', 'dodge'].includes(build.id));

export function reviewBuild(state: BuildState) {
  const attributes = activeAttributes(state);
  const freePoints = (state.budget ?? state.level) - totalAttributes(state.points);
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
  return state.level + ':' + (state.budget ?? state.level);
}

export function analyzeBuild(state: BuildState) {
  const player = combatant(state);
  const roundtable = practiceProfiles.map(template => applyBuildPreset(template, { ...state, buffs: emptyAttributes }));
  const opponents = roundtable.map(combatant);
  const matchups = opponents.map((opponent, index) => {
    const result = { id: practiceProfiles[index].id, wins: 0, draws: 0, trials: battlesPerMatchup };
    for (let trial = 0; trial < battlesPerMatchup; trial++) {
      const seed = (2000 + index * 19117 + Math.floor(trial / 2)) * 9973;
      const duel = simulateDuel(player, opponent, seed, trial % 2 === 1);
      if (duel.outcome > 0) result.wins++;
      if (duel.outcome === 0) result.draws++;
    }
    return result;
  });

  return {
    key: practiceKey(state), matchups,
    skillLevel: roundtable[0]?.skills.find(slot => slot !== null)?.level,
    enchant: roundtable[0]?.rings.find(slot => slot !== null)?.enchant,
  };
}
