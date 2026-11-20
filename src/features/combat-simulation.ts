import { battleStats, skillCooldown, skillHpMultiplier, skillMana } from '../domain/combat';
import { activeAttributes, skillById, type BuildState } from './combat-builds';
import levels from './skill-levels.json';

type Skill = { id: number; passive: boolean; mana: number; cooldown: number; tier: number; value: number; duration: number; dps: number };
type Fighter = ReturnType<typeof battleStats> & { skills: Skill[]; scale: number };

export function combatant(build: BuildState): Fighter {
  const { strength, agility, wisdom, endurance } = activeAttributes(build);
  const skills = build.skills.flatMap(slot => {
    const skill = slot && skillById.get(slot.id);
    if (!slot || !skill) return [];
    const effect = levels[String(skill.id) as keyof typeof levels];
    const passive = skill.type === 'passive';
    return [{
      id: skill.id, passive, tier: skill.tier, mana: skillMana(skill.tier, passive, skill.id === 10),
      cooldown: skillCooldown(skill.tier) * 1000, value: effect.value[slot.level - 1], duration: effect.dur[slot.level - 1] * 1000,
      dps: 'dps' in effect ? effect.dps[slot.level - 1] : 0,
    }];
  });
  return { ...battleStats(build.level, strength, agility, wisdom, endurance), skills, scale: skillHpMultiplier(build.level) };
}

function rng(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function fighter(stats: Fighter, guard: number) {
  const passives = new Map(stats.skills.filter(skill => skill.passive).map(skill => [skill.id, skill]));
  return {
    stats, hp: stats.health, mana: stats.mana, guard, lastZone: guard, streak: 0,
    passives, active: stats.skills.filter(skill => !skill.passive), cooldowns: new Map<number, number>(),
    attackAt: 0, guardAt: 0, castAt: 0, locked: 0, stunned: 0, chilled: 0, chains: 0, revealed: 0,
    phase: 0, evade: 0, dodgeCharges: 0, gamble: 0,
    reflect: 0, reflectPct: 0, lift: 0, liftPct: 0, echo: 0, echoPct: 0,
    burn: 0, burnDps: 0, burnCarry: 0,
    poisonTicks: 0, poisonDamage: 0, poisonAt: 0, poisonedAttack: false,
    manaShort: false, blocked: 0, evaded: 0, attempts: 0,
  };
}

type FighterState = ReturnType<typeof fighter>;
type QueuedHit = { at: number; from: FighterState; target: FighterState; amount: number; zone?: number };

export function simulateDuel(first: Fighter, second: Fighter, seed: number, reverse = false) {
  const random = rng(seed);
  const round = (value: number) => Math.floor(value) + Number(random() < value % 1);
  const a = fighter(reverse ? second : first, Math.floor(random() * 3));
  const b = fighter(reverse ? first : second, Math.floor(random() * 3));
  const queue: QueuedHit[] = [];
  let now = 0;

  function passive(state: FighterState, id: number) {
    const skill = state.passives.get(id);
    if (!skill || state.mana < skill.mana) return 0;
    state.mana -= skill.mana;
    return Math.trunc(skill.value);
  }

  function damage(target: FighterState, value: number) {
    if (target.phase > now || value <= 0) return 0;
    const amount = round(value * (1 - passive(target, 4) / 100));
    target.hp = Math.max(0, target.hp - amount);
    return amount;
  }

  function canTarget(source: FighterState, target: FighterState, zone: number) {
    if (zone === target.guard) { source.blocked++; return false; }
    if (target.evade > now && target.dodgeCharges > 0) {
      target.dodgeCharges--;
      source.evaded++;
      return false;
    }
    if (random() * 100 < target.stats.dodge) { source.evaded++; return false; }
    return true;
  }

  function strike(source: FighterState, target: FighterState, zone: number, basic: boolean) {
    source.attempts++;
    if (source.poisonTicks && now < source.poisonAt) source.poisonedAttack = true;
    if (!canTarget(source, target, zone)) {
      if (basic) source.streak = 0;
      return;
    }
    let hit = source.stats.hit;
    if (source.gamble > 0) {
      hit *= random() * 100 < source.gamble ? 5 : 0;
      source.gamble = 0;
      source.streak = 0;
      basic = false;
    }
    if (hit > 0) {
      hit *= 1 + passive(source, 2) / 100;
      if (random() * 100 < source.stats.crit) hit *= 2;
    }
    const raw = Math.min(round(hit), Math.floor(target.stats.health * .35));
    const landed = damage(target, raw);
    if (landed <= 0) {
      if (basic) source.streak = 0;
      return;
    }
    if (source.lift > now) source.hp = Math.min(source.stats.health, source.hp + round(landed * source.liftPct));
    if (target.reflect > now) damage(source, round(landed * target.reflectPct));
    if (source.echo > now) queue.push({ at: now + 600, from: source, target, amount: round(landed * source.echoPct) });
    if (basic && ++source.streak === 3) {
      source.streak = 0;
      const multiplier = 1 - passive(target, 19) / 100;
      target.stunned = Math.max(target.stunned, now + 1500 * multiplier);
      for (const delay of [490, 630, 770, 910]) {
        queue.push({ at: now + delay, from: source, target, amount: round(raw * .5 * multiplier) });
      }
    }
  }

  function cast(source: FighterState, target: FighterState, skill: Skill) {
    const duration = skill.duration;
    const value = Math.trunc(skill.value);
    const scaled = skill.value * source.stats.scale;
    const lock = skill.tier === 5 ? 2000 : 0;
    source.mana -= skill.mana;
    source.cooldowns.set(skill.id, now + skill.cooldown);
    source.castAt = now + 1000 + lock;
    if (lock) {
      source.locked = now + lock;
      source.attackAt = Math.max(source.attackAt, source.locked);
      source.guardAt = Math.max(source.guardAt, source.locked);
    }
    const controlUntil = () => now + lock + duration * (1 - passive(target, 19) / 100);
    // The cast lock delays the next input. It does not cancel the spell which set it.
    switch (skill.id) {
      case 1: damage(target, round(scaled)); break;
      case 3: source.hp = Math.min(source.stats.health, source.hp + round(scaled)); break;
      case 5:
        target.poisonTicks = Math.floor(duration / 1000 * (1 - passive(target, 19) / 100));
        target.poisonDamage = round(scaled);
        target.poisonAt = now + 1500;
        target.poisonedAttack = false;
        break;
      case 6: damage(target, round(scaled)); target.chilled = Math.max(target.chilled, controlUntil()); break;
      case 7: target.stunned = Math.max(target.stunned, controlUntil()); break;
      case 8: source.dodgeCharges = round(skill.value); source.evade = now + duration; break;
      case 9: source.reflect = now + duration; source.reflectPct = value / 100; break;
      case 11:
        damage(target, round(scaled));
        target.burn = now + duration;
        target.burnDps = skill.dps * source.stats.scale;
        target.burnCarry = 0;
        break;
      case 12:
        damage(target, round(scaled * (1 + 3 * (1 - source.hp / source.stats.health))));
        source.hp = Math.max(1, source.hp - round(3 * source.stats.scale));
        break;
      case 13:
        for (let i = 0, count = round(skill.value); i < count; i++) {
          queue.push({ at: now + i * 250, from: source, target, amount: 0, zone: source.lastZone });
        }
        break;
      case 14: source.echo = now + duration; source.echoPct = value / 100; break;
      case 15: source.gamble = value; break;
      case 16: damage(target, round(scaled)); target.stunned = Math.max(target.stunned, controlUntil()); break;
      case 17: target.chains = Math.max(target.chains, controlUntil()); break;
      case 18: source.lift = now + duration; source.liftPct = value / 100; break;
      case 20: source.phase = now + duration; break;
    }
  }

  function tickEffects(state: FighterState) {
    if (state.burn >= now && state.burnDps > 0) {
      state.burnCarry += state.burnDps / 10;
      const damageNow = Math.floor(state.burnCarry);
      state.burnCarry -= damageNow;
      damage(state, damageNow);
    }
    if (state.poisonTicks > 0 && now >= state.poisonAt) {
      if (state.poisonedAttack) damage(state, state.poisonDamage);
      state.poisonAt += 1500;
      state.poisonTicks--;
      state.poisonedAttack = false;
    }
  }

  function act(source: FighterState, target: FighterState) {
    if (source.hp <= 0 || target.hp <= 0 || now < source.locked) return;
    if (now >= source.guardAt && now >= source.chains) {
      source.guard = (source.guard + 1 + Number(random() < .5)) % 3;
      source.guardAt = now + 1000;
      const reveal = target.passives.get(10);
      if (reveal && target.mana >= reveal.mana) {
        target.mana -= reveal.mana;
        target.revealed = now + reveal.duration;
      }
    }
    if (now < source.stunned) return;
    if (now >= source.castAt) {
      for (const skill of source.active) {
        if (now < (source.cooldowns.get(skill.id) ?? 0)) continue;
        if (skill.id === 3 && source.stats.health - source.hp < Math.round(skill.value * source.stats.scale)) continue;
        if (skill.id === 13 && source.lastZone === target.guard && (source.revealed > now || target.chains > now)) continue;
        if ([1, 6, 11, 12, 16].includes(skill.id) && target.phase > now) continue;
        if (source.mana < skill.mana) { source.manaShort = true; continue; }
        cast(source, target, skill);
        break;
      }
    }
    if (source.hp <= 0 || target.hp <= 0 || now < source.attackAt || now < source.locked) return;
    source.attackAt = now + (source.chilled > now ? 3000 : 1500);
    const informed = source.revealed > now || target.chains > now;
    source.lastZone = informed ? (target.guard + 1 + Number(random() < .5)) % 3 : Math.floor(random() * 3);
    strike(source, target, source.lastZone, true);
  }

  const aFirst = random() < .5;
  for (; now < 600_000 && a.hp > 0 && b.hp > 0; now += 100) {
    tickEffects(a);
    tickEffects(b);
    for (let i = 0; i < queue.length && a.hp > 0 && b.hp > 0;) {
      const event = queue[i];
      if (event.at > now) { i++; continue; }
      queue.splice(i, 1);
      if (event.zone === undefined) damage(event.target, event.amount);
      else strike(event.from, event.target, event.zone, false);
    }
    if (aFirst) { act(a, b); act(b, a); }
    else { act(b, a); act(a, b); }
  }

  const player = reverse ? b : a;
  const opponent = reverse ? a : b;
  return {
    outcome: Math.sign(player.hp / player.stats.health - opponent.hp / opponent.stats.health), duration: now / 1000,
    manaShort: player.manaShort, blocked: player.blocked, evaded: player.evaded, attempts: player.attempts,
  };
}
