export function baseHealth(level: number, endurance = 0) {
  return 20 + 2 * endurance + 3 * Math.max(0, level);
}

export function battleStats(level: number, strength: number, agility: number, wisdom: number, endurance: number) {
  return {
    health: baseHealth(level, endurance),
    mana: 200 + 20 * Math.max(0, wisdom),
    hit: 1.35 + 0.065 * strength + 0.1875 * Math.max(0, level),
    dodge: Math.min(70, 0.7 * Math.max(0, agility)),
    crit: Math.min(70, 0.7 * Math.max(0, wisdom)),
  };
}

export function skillHpMultiplier(owlLevel: number) {
  return baseHealth(owlLevel) / baseHealth(20);
}
