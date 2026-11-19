import { useState, useMemo, useRef } from 'react';
import { GameGlyph, GameAttribute, type GameAttributeName } from '../ui/GameGlyph';
import { GameSymbol } from '../ui/GameSymbol';
import { GameArt } from '../ui/GameArt';
import { battleStats } from '../domain/combat';
import { lightHaptic } from '../telegram/client';
import { useGuideLocale } from './guideLocale';
import { useModal } from '../ui/useModal';
import rawSkills from '../../public/data/skills.json';
import { skillCopy } from './skill-copy';

export type StatKey = 'strength' | 'agility' | 'wisdom' | 'endurance';

export interface RingItem {
  id: string;
  nameRu: string;
  nameEn: string;
  tier: 1 | 2 | 3;
  stat: 'strength' | 'agility' | 'wisdom';
  baseBonus: number;
  reqLevel: number;
}

export const RINGS_CATALOG: RingItem[] = [
  { id: 'ring-str-1', nameRu: 'Деревянное кольцо силы', nameEn: 'Wooden Ring of Strength', tier: 1, stat: 'strength', baseBonus: 2, reqLevel: 5 },
  { id: 'ring-ag-1', nameRu: 'Деревянное кольцо ловкости', nameEn: 'Wooden Ring of Agility', tier: 1, stat: 'agility', baseBonus: 2, reqLevel: 5 },
  { id: 'ring-wit-1', nameRu: 'Деревянное кольцо мудрости', nameEn: 'Wooden Ring of Wisdom', tier: 1, stat: 'wisdom', baseBonus: 2, reqLevel: 5 },
  { id: 'ring-str-2', nameRu: 'Обсидиановое кольцо силы', nameEn: 'Obsidian Ring of Strength', tier: 2, stat: 'strength', baseBonus: 5, reqLevel: 10 },
  { id: 'ring-ag-2', nameRu: 'Обсидиановое кольцо ловкости', nameEn: 'Obsidian Ring of Agility', tier: 2, stat: 'agility', baseBonus: 5, reqLevel: 10 },
  { id: 'ring-wit-2', nameRu: 'Обсидиановое кольцо мудрости', nameEn: 'Obsidian Ring of Wisdom', tier: 2, stat: 'wisdom', baseBonus: 5, reqLevel: 10 },
  { id: 'ring-str-3', nameRu: 'Золотое кольцо силы', nameEn: 'Golden Ring of Strength', tier: 3, stat: 'strength', baseBonus: 10, reqLevel: 20 },
  { id: 'ring-ag-3', nameRu: 'Золотое кольцо ловкости', nameEn: 'Golden Ring of Agility', tier: 3, stat: 'agility', baseBonus: 10, reqLevel: 20 },
  { id: 'ring-wit-3', nameRu: 'Золотое кольцо мудрости', nameEn: 'Golden Ring of Wisdom', tier: 3, stat: 'wisdom', baseBonus: 10, reqLevel: 20 },
];

export interface EquippedRing {
  ringId: string | null;
  enchant: number;
}

interface SkillItem {
  id: number;
  name: string;
  nameRu: string;
  descRu: string;
  branch: GameAttributeName;
  tier: number;
  type: 'active' | 'passive';
  manaCost: number;
  dojoEnergy: number;
}

const ALL_SKILLS: SkillItem[] = rawSkills.map(s => {
  const ru = skillCopy[s.id - 1];
  const manaCost = s.type === 'active' ? 25 * s.tier : (s.id === 10 ? 20 : 2 * s.tier);
  return {
    id: s.id,
    name: s.name,
    nameRu: ru ? ru[0] : s.name,
    descRu: ru ? ru[1] : s.description,
    branch: s.branch as GameAttributeName,
    tier: s.tier,
    type: s.type as 'active' | 'passive',
    manaCost,
    dojoEnergy: s.dojoEnergy,
  };
});

const STAT_CONFIG: { key: StatKey; nameRu: string; nameEn: string; descRu: string; descEn: string }[] = [
  { key: 'strength', nameRu: 'Сила', nameEn: 'Strength', descRu: '+0,065 урона за очко', descEn: '+0.065 hit damage per point' },
  { key: 'agility', nameRu: 'Ловкость', nameEn: 'Agility', descRu: '+0,7% уклонения (макс. 70%)', descEn: '+0.7% dodge (max 70%)' },
  { key: 'wisdom', nameRu: 'Мудрость', nameEn: 'Wisdom', descRu: '+0,7% крита (макс. 70%), +20 маны', descEn: '+0.7% crit (max 70%), +20 mana' },
  { key: 'endurance', nameRu: 'Выносливость', nameEn: 'Endurance', descRu: '+2 HP за очко', descEn: '+2 HP per point' },
];

const PRESETS = [
  { id: 'balanced', nameRu: 'Сбалансированный', nameEn: 'Balanced', icon: '⚖️' },
  { id: 'crit_mage', nameRu: 'Крит-маг', nameEn: 'Crit Caster', icon: '🔮' },
  { id: 'berserk', nameRu: 'Берсерк', nameEn: 'Berserker', icon: '⚔️' },
  { id: 'dodger', nameRu: 'Уворотчик', nameEn: 'Dodger', icon: '🌪️' },
  { id: 'tank', nameRu: 'Танк', nameEn: 'Tank', icon: '🛡️' },
  { id: 'reset', nameRu: 'Сбросить', nameEn: 'Reset', icon: '🔄' },
] as const;

export function BuildConstructor() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';

  const [level, setLevel] = useState<number>(20);
  const [allocated, setAllocated] = useState<Record<StatKey, number>>({
    strength: 0,
    agility: 0,
    wisdom: 0,
    endurance: 0,
  });

  const [rings, setRings] = useState<EquippedRing[]>([
    { ringId: null, enchant: 0 },
    { ringId: null, enchant: 0 },
    { ringId: null, enchant: 0 },
  ]);

  const [selectedSkills, setSelectedSkills] = useState<(number | null)[]>([null, null, null]);

  // Modal pickers state
  const [pickerSlot, setPickerSlot] = useState<{ type: 'ring' | 'skill'; slotIndex: number } | null>(null);

  // Formatting helpers
  const formatOne = useMemo(() => new Intl.NumberFormat(en ? 'en-US' : 'ru-RU', { maximumFractionDigits: 1 }), [en]);
  const formatInt = useMemo(() => new Intl.NumberFormat(en ? 'en-US' : 'ru-RU', { maximumFractionDigits: 0 }), [en]);

  // Points calculation
  const allocatedTotal = allocated.strength + allocated.agility + allocated.wisdom + allocated.endurance;
  const remainingPoints = level - allocatedTotal;

  // Ring stat bonuses
  const ringBonuses = useMemo(() => {
    const bonuses: Record<'strength' | 'agility' | 'wisdom', number> = {
      strength: 0,
      agility: 0,
      wisdom: 0,
    };
    for (const slot of rings) {
      if (!slot.ringId) continue;
      const ring = RINGS_CATALOG.find(r => r.id === slot.ringId);
      if (ring) {
        bonuses[ring.stat] += ring.baseBonus + slot.enchant;
      }
    }
    return bonuses;
  }, [rings]);

  // Effective stats (allocated base points + ring bonuses)
  const effectiveStats = useMemo(() => ({
    strength: allocated.strength + ringBonuses.strength,
    agility: allocated.agility + ringBonuses.agility,
    wisdom: allocated.wisdom + ringBonuses.wisdom,
    endurance: allocated.endurance,
  }), [allocated, ringBonuses]);

  // Battle combat stats HUD from domain/combat.ts
  const combatHUD = useMemo(() => {
    return battleStats(
      level,
      effectiveStats.strength,
      effectiveStats.agility,
      effectiveStats.wisdom,
      effectiveStats.endurance
    );
  }, [level, effectiveStats]);

  // Level change handler with auto-refund if spent points exceed new level
  function handleLevelChange(newLevel: number) {
    const clamped = Math.max(1, Math.min(100, Math.trunc(newLevel) || 1));
    setLevel(clamped);
    const total = allocated.strength + allocated.agility + allocated.wisdom + allocated.endurance;
    if (total > clamped) {
      let excess = total - clamped;
      const next = { ...allocated };
      const order: StatKey[] = ['endurance', 'wisdom', 'agility', 'strength'];
      for (const key of order) {
        if (excess <= 0) break;
        const deduct = Math.min(next[key], excess);
        next[key] -= deduct;
        excess -= deduct;
      }
      setAllocated(next);
    }
  }

  // Stat point modification
  function modifyStat(stat: StatKey, delta: number) {
    lightHaptic();
    setAllocated(prev => {
      const current = prev[stat];
      if (delta > 0) {
        const allowed = Math.min(delta, remainingPoints);
        if (allowed <= 0) return prev;
        return { ...prev, [stat]: current + allowed };
      } else {
        const allowed = Math.min(Math.abs(delta), current);
        if (allowed <= 0) return prev;
        return { ...prev, [stat]: current - allowed };
      }
    });
  }

  // Ring enchant stepper
  function modifyRingEnchant(slotIndex: number, delta: number) {
    lightHaptic();
    setRings(prev => {
      const copy = [...prev];
      const slot = copy[slotIndex];
      if (!slot.ringId) return prev;
      const nextEnchant = Math.max(0, Math.min(20, slot.enchant + delta));
      copy[slotIndex] = { ...slot, enchant: nextEnchant };
      return copy;
    });
  }

  // Ring equip / unequip
  function equipRing(slotIndex: number, ringId: string | null) {
    lightHaptic();
    setRings(prev => {
      const copy = [...prev];
      copy[slotIndex] = { ringId, enchant: ringId ? copy[slotIndex]?.enchant || 0 : 0 };
      return copy;
    });
    setPickerSlot(null);
  }

  // Skill equip / unequip
  function equipSkill(slotIndex: number, skillId: number | null) {
    lightHaptic();
    setSelectedSkills(prev => {
      const copy = [...prev];
      copy[slotIndex] = skillId;
      return copy;
    });
    setPickerSlot(null);
  }

  // Archetype preset loader
  function applyPreset(presetId: typeof PRESETS[number]['id']) {
    lightHaptic();
    if (presetId === 'reset') {
      setAllocated({ strength: 0, agility: 0, wisdom: 0, endurance: 0 });
      setRings([
        { ringId: null, enchant: 0 },
        { ringId: null, enchant: 0 },
        { ringId: null, enchant: 0 },
      ]);
      setSelectedSkills([null, null, null]);
      return;
    }

    if (presetId === 'balanced') {
      const q = Math.floor(level / 4);
      const rem = level - q * 3;
      setAllocated({ strength: q, agility: q, wisdom: q, endurance: rem });
      setRings([
        { ringId: 'ring-str-2', enchant: 3 },
        { ringId: 'ring-ag-2', enchant: 3 },
        { ringId: 'ring-wit-2', enchant: 3 },
      ]);
      setSelectedSkills([2, 3, 4]); // Power Punch, Healing, Nutshell Aegis
    } else if (presetId === 'crit_mage') {
      const wis = Math.floor(level * 0.70);
      const agi = Math.floor(level * 0.15);
      const end = level - wis - agi;
      setAllocated({ strength: 0, agility: agi, wisdom: wis, endurance: end });
      setRings([
        { ringId: 'ring-wit-3', enchant: 5 },
        { ringId: 'ring-wit-3', enchant: 5 },
        { ringId: 'ring-wit-2', enchant: 3 },
      ]);
      setSelectedSkills([1, 14, 20]); // Lightning, Echoing Blow, Phase Shift
    } else if (presetId === 'berserk') {
      const str = Math.floor(level * 0.80);
      const end = level - str;
      setAllocated({ strength: str, agility: 0, wisdom: 0, endurance: end });
      setRings([
        { ringId: 'ring-str-3', enchant: 5 },
        { ringId: 'ring-str-3', enchant: 5 },
        { ringId: 'ring-str-2', enchant: 3 },
      ]);
      setSelectedSkills([13, 2, 15]); // Berserk Howl, Power Punch, Double Down
    } else if (presetId === 'dodger') {
      const agi = Math.floor(level * 0.80);
      const end = level - agi;
      setAllocated({ strength: 0, agility: agi, wisdom: 0, endurance: end });
      setRings([
        { ringId: 'ring-ag-3', enchant: 5 },
        { ringId: 'ring-ag-3', enchant: 5 },
        { ringId: 'ring-ag-2', enchant: 3 },
      ]);
      setSelectedSkills([8, 5, 6]); // Evada Kedabra, Toxic Spores, Snowball
    } else if (presetId === 'tank') {
      const end = Math.floor(level * 0.80);
      const str = Math.floor(level * 0.10);
      const wis = level - end - str;
      setAllocated({ strength: str, agility: 0, wisdom: wis, endurance: end });
      setRings([
        { ringId: 'ring-str-3', enchant: 5 },
        { ringId: 'ring-ag-3', enchant: 5 },
        { ringId: 'ring-wit-3', enchant: 5 },
      ]);
      setSelectedSkills([4, 19, 18]); // Nutshell Aegis, Iron Will, Vampire Fang
    }
  }

  return (
    <div className="buildConstructor">
      {/* Intro & Overview */}
      <section className="card buildIntroCard">
        <div className="buildIntroHead">
          <div>
            <h2>{en ? 'Interactive Build Constructor' : 'Конструктор боевых билдов'}</h2>
            <p className="caption">
              {en
                ? 'Allocate stat points, equip rings with enchants, and craft your optimal skill loadout with real-time battle stats.'
                : 'Распределяй очки атрибутов, надевай кольца с заточкой и собирай набор из трёх боевых навыков с расчётом параметров в реальном времени.'}
            </p>
          </div>
        </div>

        {/* Quick Archetype Presets */}
        <div className="buildPresetSection">
          <span className="buildSectionLabel">{en ? 'Archetype Presets' : 'Готовые архетипы:'}</span>
          <div className="buildPresetGrid" role="group" aria-label="Готовые архетипы">
            {PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                className={`buildPresetBtn ${p.id === 'reset' ? 'buildPresetReset' : ''}`}
                onClick={() => applyPreset(p.id)}
              >
                <span className="buildPresetIcon" aria-hidden="true">{p.icon}</span>
                <span>{en ? p.nameEn : p.nameRu}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Level Selector & Remaining Points Banner */}
      <section className="card buildLevelCard">
        <div className="buildLevelHeader">
          <div className="buildLevelTitleGroup">
            <span className="buildLevelLabel">{en ? 'Owl Level' : 'Уровень совы'}</span>
            <strong className="buildLevelValue">{level}</strong>
          </div>
          <div className={`buildPointsBadge ${remainingPoints > 0 ? 'buildPointsPositive' : 'buildPointsSpent'}`}>
            <span>{en ? 'Unspent Points:' : 'Осталось очков:'}</span>
            <b>{remainingPoints}</b>
          </div>
        </div>

        <div className="buildLevelControls">
          <div className="buildLevelSliderRow">
            <input
              type="range"
              min={1}
              max={100}
              value={level}
              onChange={e => handleLevelChange(Number(e.target.value))}
              className="buildSlider"
              aria-label={en ? 'Owl level slider' : 'Ползунок уровня совы'}
            />
          </div>

          <div className="buildQuickLevels">
            {[10, 20, 30, 50, 75, 100].map(lvl => (
              <button
                key={lvl}
                type="button"
                className={`buildQuickLvlBtn ${level === lvl ? 'active' : ''}`}
                onClick={() => {
                  lightHaptic();
                  handleLevelChange(lvl);
                }}
              >
                {lvl} ур.
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Real-time Combat HUD */}
      <section className="card buildHudCard">
        <div className="buildCardHeader">
          <GameGlyph name="fight" />
          <div>
            <h3>{en ? 'Battle Parameters (HUD)' : 'Боевые параметры (HUD)'}</h3>
            <small>{en ? 'Calculated via official game formulas' : 'Расчёт по боевым формулам Not Wise'}</small>
          </div>
        </div>

        <div className="buildHudGrid" aria-live="polite">
          {/* Health */}
          <div className="buildHudItem buildHudHp">
            <div className="buildHudItemTop">
              <GameSymbol name="heart" size={20} />
              <span>{en ? 'Health' : 'Здоровье'}</span>
            </div>
            <strong className="buildHudVal">{formatInt.format(combatHUD.health)} HP</strong>
            <small className="buildHudSub">20 + 3×ур. + 2×вын.</small>
          </div>

          {/* Mana */}
          <div className="buildHudItem buildHudMana">
            <div className="buildHudItemTop">
              <GameSymbol name="bolt" size={20} />
              <span>{en ? 'Mana' : 'Мана'}</span>
            </div>
            <strong className="buildHudVal">{formatInt.format(combatHUD.mana)}</strong>
            <small className="buildHudSub">200 + 20×мудр.</small>
          </div>

          {/* Base Hit Damage */}
          <div className="buildHudItem buildHudHit">
            <div className="buildHudItemTop">
              <GameSymbol name="swords" size={20} />
              <span>{en ? 'Base Hit' : 'Базовый урон'}</span>
            </div>
            <strong className="buildHudVal">{formatOne.format(combatHUD.hit)} HP</strong>
            <small className="buildHudSub">1.35 + 0.065×сил. + 0.1875×ур.</small>
          </div>

          {/* Dodge % */}
          <div className="buildHudItem buildHudDodge">
            <div className="buildHudItemTop">
              <GameGlyph name="leaf" />
              <span>{en ? 'Dodge' : 'Уклонение'}</span>
            </div>
            <strong className="buildHudVal">{formatOne.format(combatHUD.dodge)}%</strong>
            <small className="buildHudSub">+0,7%×ловк. (макс. 70%)</small>
          </div>

          {/* Crit % */}
          <div className="buildHudItem buildHudCrit">
            <div className="buildHudItemTop">
              <GameGlyph name="sparkles" />
              <span>{en ? 'Critical' : 'Крит (×2.0)'}</span>
            </div>
            <strong className="buildHudVal">{formatOne.format(combatHUD.crit)}%</strong>
            <small className="buildHudSub">+0,7%×мудр. (макс. 70%)</small>
          </div>
        </div>
      </section>

      {/* Base Stat Allocation */}
      <section className="card buildStatsCard">
        <div className="buildCardHeader">
          <GameGlyph name="shield" />
          <div>
            <h3>{en ? 'Attribute Points Allocation' : 'Распределение очков характеристик'}</h3>
            <small>
              {en
                ? `1 point per owl level (${remainingPoints} unspent)`
                : `1 очко за каждый уровень совы (свободно: ${remainingPoints})`}
            </small>
          </div>
        </div>

        <div className="buildStatList">
          {STAT_CONFIG.map(st => {
            const basePts = allocated[st.key];
            const ringBonus = st.key !== 'endurance' ? ringBonuses[st.key] : 0;
            const effective = basePts + ringBonus;

            return (
              <div className="buildStatRow" key={st.key}>
                <div className="buildStatInfo">
                  <div className="buildStatNameRow">
                    <GameAttribute name={st.key} />
                    <strong>{en ? st.nameEn : st.nameRu}</strong>
                  </div>
                  <span className="buildStatDesc">{en ? st.descEn : st.descRu}</span>
                  <div className="buildStatBreakdown">
                    <span>{en ? 'Base:' : 'База:'} <b>{basePts}</b></span>
                    {ringBonus > 0 && (
                      <span className="buildStatRingBonus">
                        +<b>{ringBonus}</b> {en ? 'rings' : 'кольца'}
                      </span>
                    )}
                    <span className="buildStatTotal">
                      = <b>{effective}</b> {en ? 'total' : 'итог'}
                    </span>
                  </div>
                </div>

                <div className="buildStatSteppers">
                  <button
                    type="button"
                    className="buildStepBtn"
                    disabled={basePts <= 0}
                    onClick={() => modifyStat(st.key, -1)}
                    aria-label={`Уменьшить ${st.nameRu} на 1`}
                  >
                    −
                  </button>
                  <span className="buildStatCurrent">{basePts}</span>
                  <button
                    type="button"
                    className="buildStepBtn"
                    disabled={remainingPoints <= 0}
                    onClick={() => modifyStat(st.key, 1)}
                    aria-label={`Увеличить ${st.nameRu} на 1`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="buildStepQuickBtn"
                    disabled={remainingPoints <= 0}
                    onClick={() => modifyStat(st.key, 5)}
                    aria-label={`Увеличить ${st.nameRu} на 5`}
                  >
                    +5
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Equipment: 3 Ring Slots */}
      <section className="card buildEquipmentCard">
        <div className="buildCardHeader">
          <GameGlyph name="treasure" />
          <div>
            <h3>{en ? 'Equipment: Rings (3 Slots)' : 'Экипировка: Кольца (3 слота)'}</h3>
            <small>
              {en
                ? 'Select rings and sharpen them up to +20 (+1 attribute per enchant level)'
                : 'Выбирай кольца и усиливай заточкой до +20 (+1 к атрибуту за ур. заточки)'}
            </small>
          </div>
        </div>

        <div className="buildRingGrid">
          {rings.map((slot, idx) => {
            const ringDef = slot.ringId ? RINGS_CATALOG.find(r => r.id === slot.ringId) : null;
            const totalRingStat = ringDef ? ringDef.baseBonus + slot.enchant : 0;
            const statNameRu = ringDef
              ? ringDef.stat === 'strength'
                ? 'Сила'
                : ringDef.stat === 'agility'
                ? 'Ловкость'
                : 'Мудрость'
              : '';
            const statNameEn = ringDef ? ringDef.stat : '';

            return (
              <div className="buildRingSlotCard" key={idx}>
                <div className="buildSlotHeader">
                  <span className="buildSlotIdx">{en ? `Ring #${idx + 1}` : `Кольцо #${idx + 1}`}</span>
                  {ringDef && (
                    <button
                      type="button"
                      className="buildSlotClearBtn"
                      onClick={() => equipRing(idx, null)}
                      aria-label="Снять кольцо"
                    >
                      ×
                    </button>
                  )}
                </div>

                {ringDef ? (
                  <div className="buildRingSlotContent">
                    <button
                      type="button"
                      className="buildRingThumbBtn"
                      onClick={() => {
                        lightHaptic();
                        setPickerSlot({ type: 'ring', slotIndex: idx });
                      }}
                    >
                      <GameArt path={`/game/items/${ringDef.id}.webp`} size={46} />
                      <div className="buildRingNameGroup">
                        <strong>{en ? ringDef.nameEn : ringDef.nameRu}</strong>
                        <span className="buildRingTierBadge">Тир {ringDef.tier}</span>
                      </div>
                    </button>

                    <div className="buildRingBonusRow">
                      <span className="buildRingBonusTag">
                        +{totalRingStat} {en ? statNameEn : statNameRu}
                      </span>
                      <small className="buildRingBaseNote">
                        (база {ringDef.baseBonus} + {slot.enchant})
                      </small>
                    </div>

                    <div className="buildEnchantRow">
                      <span className="buildEnchantLabel">{en ? 'Sharpening:' : 'Заточка:'}</span>
                      <div className="buildEnchantSteppers">
                        <button
                          type="button"
                          className="buildStepBtn buildEnchantBtn"
                          disabled={slot.enchant <= 0}
                          onClick={() => modifyRingEnchant(idx, -1)}
                          aria-label="Уменьшить заточку"
                        >
                          −
                        </button>
                        <span className="buildEnchantVal">+{slot.enchant}</span>
                        <button
                          type="button"
                          className="buildStepBtn buildEnchantBtn"
                          disabled={slot.enchant >= 20}
                          onClick={() => modifyRingEnchant(idx, 1)}
                          aria-label="Увеличить заточку"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="buildEmptySlotBtn"
                    onClick={() => {
                      lightHaptic();
                      setPickerSlot({ type: 'ring', slotIndex: idx });
                    }}
                  >
                    <span className="buildEmptySlotIcon">💍</span>
                    <span>{en ? '+ Equip Ring' : '+ Надеть кольцо'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Combat Skill Loadout: 3 Slots */}
      <section className="card buildSkillsCard">
        <div className="buildCardHeader">
          <GameGlyph name="lightning" />
          <div>
            <h3>{en ? 'Combat Skills Loadout (3 Slots)' : 'Набор боевых навыков (3 слота)'}</h3>
            <small>
              {en
                ? 'Equip up to 3 skills for battle from the 4 combat branches'
                : 'В бой можно взять до трёх навыков из четырёх веток атрибутов'}
            </small>
          </div>
        </div>

        <div className="buildSkillSlotGrid">
          {selectedSkills.map((skillId, idx) => {
            const skill = skillId ? ALL_SKILLS.find(s => s.id === skillId) : null;
            const branchRu = skill
              ? skill.branch === 'strength'
                ? 'Сила'
                : skill.branch === 'agility'
                ? 'Ловкость'
                : skill.branch === 'wisdom'
                ? 'Мудрость'
                : 'Выносливость'
              : '';

            return (
              <div className="buildSkillSlotCard" key={idx}>
                <div className="buildSlotHeader">
                  <span className="buildSlotIdx">{en ? `Skill Slot #${idx + 1}` : `Слот навыка #${idx + 1}`}</span>
                  {skill && (
                    <button
                      type="button"
                      className="buildSlotClearBtn"
                      onClick={() => equipSkill(idx, null)}
                      aria-label="Снять навык"
                    >
                      ×
                    </button>
                  )}
                </div>

                {skill ? (
                  <div className="buildSkillSlotContent">
                    <button
                      type="button"
                      className="buildSkillSlotItemBtn"
                      onClick={() => {
                        lightHaptic();
                        setPickerSlot({ type: 'skill', slotIndex: idx });
                      }}
                    >
                      <GameArt path={`/game/skills/${skill.id}.png`} size={46} />
                      <div className="buildSkillSlotText">
                        <strong>{en ? skill.name : skill.nameRu}</strong>
                        <div className="buildSkillBadges">
                          <span className="buildSkillBranchBadge">
                            <GameAttribute name={skill.branch} /> {branchRu}
                          </span>
                          <span className="buildSkillTierBadge">Ступень {skill.tier}</span>
                        </div>
                      </div>
                    </button>

                    <div className="buildSkillMetaRow">
                      <span className="buildSkillManaTag">
                        {skill.type === 'active' ? '⚡ ' : '🛡️ '}
                        {skill.manaCost} {en ? 'mana' : 'маны'}
                      </span>
                      <span className="buildSkillTypeTag">
                        {skill.type === 'active'
                          ? en ? 'Active' : 'Активный'
                          : en ? 'Passive' : 'Пассивный'}
                      </span>
                    </div>

                    <p className="buildSkillSlotDesc">{skill.descRu}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="buildEmptySlotBtn"
                    onClick={() => {
                      lightHaptic();
                      setPickerSlot({ type: 'skill', slotIndex: idx });
                    }}
                  >
                    <span className="buildEmptySlotIcon">✨</span>
                    <span>{en ? '+ Select Skill' : '+ Выбрать навык'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Ring Picker Modal */}
      {pickerSlot?.type === 'ring' && (
        <RingPickerModal
          slotIndex={pickerSlot.slotIndex}
          currentRingId={rings[pickerSlot.slotIndex].ringId}
          onSelect={ringId => equipRing(pickerSlot.slotIndex, ringId)}
          onClose={() => setPickerSlot(null)}
          en={en}
        />
      )}

      {/* Skill Picker Modal */}
      {pickerSlot?.type === 'skill' && (
        <SkillPickerModal
          slotIndex={pickerSlot.slotIndex}
          currentSkillId={selectedSkills[pickerSlot.slotIndex]}
          alreadySelectedIds={selectedSkills.filter((id, i): id is number => id !== null && i !== pickerSlot.slotIndex)}
          allocatedBranchPoints={allocated}
          onSelect={skillId => equipSkill(pickerSlot.slotIndex, skillId)}
          onClose={() => setPickerSlot(null)}
          en={en}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Ring Picker Modal Component
// -----------------------------------------------------------------------------
interface RingPickerModalProps {
  slotIndex: number;
  currentRingId: string | null;
  onSelect: (ringId: string | null) => void;
  onClose: () => void;
  en: boolean;
}

function RingPickerModal({ slotIndex, currentRingId, onSelect, onClose, en }: RingPickerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [filterStat, setFilterStat] = useState<string>('all');
  useModal(dialogRef, true);

  const filteredRings = useMemo(() => {
    if (filterStat === 'all') return RINGS_CATALOG;
    return RINGS_CATALOG.filter(r => r.stat === filterStat);
  }, [filterStat]);

  return (
    <dialog
      className="modal buildPickerModal"
      ref={dialogRef}
      aria-labelledby="ring-modal-title"
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialogBody buildPickerBody">
        <div className="tokenRatesDialogHeader">
          <h2 id="ring-modal-title" data-dialog-title tabIndex={-1}>
            {en ? `Choose Ring for Slot #${slotIndex + 1}` : `Выбор кольца (Слот #${slotIndex + 1})`}
          </h2>
          <button className="close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {/* Filter chips */}
        <div className="buildFilterChips" role="tablist">
          {[
            ['all', en ? 'All' : 'Все'],
            ['strength', en ? 'Strength' : 'Сила'],
            ['agility', en ? 'Agility' : 'Ловкость'],
            ['wisdom', en ? 'Wisdom' : 'Мудрость'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`buildChipBtn ${filterStat === key ? 'active' : ''}`}
              onClick={() => {
                lightHaptic();
                setFilterStat(key);
              }}
            >
              {key !== 'all' && <GameAttribute name={key as GameAttributeName} />}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Catalog List */}
        <div className="buildPickerList">
          {currentRingId && (
            <button
              type="button"
              className="buildPickerItem buildPickerClearItem"
              onClick={() => onSelect(null)}
            >
              <span className="buildPickerClearIcon">✕</span>
              <div>
                <strong>{en ? 'Unequip Ring' : 'Снять кольцо'}</strong>
                <small>{en ? 'Leave slot empty' : 'Освободить этот слот'}</small>
              </div>
            </button>
          )}

          {filteredRings.map(ring => {
            const isEquipped = currentRingId === ring.id;
            const statRu = ring.stat === 'strength' ? 'Сила' : ring.stat === 'agility' ? 'Ловкость' : 'Мудрость';

            return (
              <button
                key={ring.id}
                type="button"
                className={`buildPickerItem ${isEquipped ? 'buildPickerItemActive' : ''}`}
                onClick={() => onSelect(ring.id)}
              >
                <GameArt path={`/game/items/${ring.id}.webp`} size={44} />
                <div className="buildPickerItemInfo">
                  <div className="buildPickerItemTitleRow">
                    <strong>{en ? ring.nameEn : ring.nameRu}</strong>
                    <span className="buildRingTierBadge">Тир {ring.tier}</span>
                  </div>
                  <div className="buildPickerItemStats">
                    <span className="buildPickerBonusText">
                      +{ring.baseBonus} {en ? ring.stat : statRu}
                    </span>
                    <small>Мин. уровень {ring.reqLevel}</small>
                  </div>
                </div>
                {isEquipped && <span className="buildPickerCheck">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}

// -----------------------------------------------------------------------------
// Skill Picker Modal Component
// -----------------------------------------------------------------------------
interface SkillPickerModalProps {
  slotIndex: number;
  currentSkillId: number | null;
  alreadySelectedIds: number[];
  allocatedBranchPoints: Record<StatKey, number>;
  onSelect: (skillId: number | null) => void;
  onClose: () => void;
  en: boolean;
}

function SkillPickerModal({
  slotIndex,
  currentSkillId,
  alreadySelectedIds,
  allocatedBranchPoints,
  onSelect,
  onClose,
  en,
}: SkillPickerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [filterBranch, setFilterBranch] = useState<string>('all');
  useModal(dialogRef, true);

  const filteredSkills = useMemo(() => {
    if (filterBranch === 'all') return ALL_SKILLS;
    return ALL_SKILLS.filter(s => s.branch === filterBranch);
  }, [filterBranch]);

  return (
    <dialog
      className="modal buildPickerModal"
      ref={dialogRef}
      aria-labelledby="skill-modal-title"
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialogBody buildPickerBody">
        <div className="tokenRatesDialogHeader">
          <h2 id="skill-modal-title" data-dialog-title tabIndex={-1}>
            {en ? `Choose Skill for Slot #${slotIndex + 1}` : `Выбор навыка (Слот #${slotIndex + 1})`}
          </h2>
          <button className="close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {/* Branch filter tabs */}
        <div className="buildFilterChips" role="tablist">
          {[
            ['all', en ? 'All' : 'Все'],
            ['strength', en ? 'Strength' : 'Сила'],
            ['agility', en ? 'Agility' : 'Ловкость'],
            ['wisdom', en ? 'Wisdom' : 'Мудрость'],
            ['endurance', en ? 'Endurance' : 'Выносливость'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`buildChipBtn ${filterBranch === key ? 'active' : ''}`}
              onClick={() => {
                lightHaptic();
                setFilterBranch(key);
              }}
            >
              {key !== 'all' && <GameAttribute name={key as GameAttributeName} />}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Skills list */}
        <div className="buildPickerList">
          {currentSkillId && (
            <button
              type="button"
              className="buildPickerItem buildPickerClearItem"
              onClick={() => onSelect(null)}
            >
              <span className="buildPickerClearIcon">✕</span>
              <div>
                <strong>{en ? 'Empty Slot' : 'Освободить слот'}</strong>
                <small>{en ? 'Remove skill from this slot' : 'Снять навык из этого слота'}</small>
              </div>
            </button>
          )}

          {filteredSkills.map(skill => {
            const isEquippedHere = currentSkillId === skill.id;
            const isEquippedElsewhere = alreadySelectedIds.includes(skill.id);
            const branchPts = allocatedBranchPoints[skill.branch as StatKey] || 0;
            const meetsTierReq = branchPts >= skill.tier;

            return (
              <button
                key={skill.id}
                type="button"
                disabled={isEquippedElsewhere}
                className={`buildPickerItem ${isEquippedHere ? 'buildPickerItemActive' : ''} ${
                  isEquippedElsewhere ? 'buildPickerItemDisabled' : ''
                }`}
                onClick={() => onSelect(skill.id)}
              >
                <GameArt path={`/game/skills/${skill.id}.png`} size={44} />
                <div className="buildPickerItemInfo">
                  <div className="buildPickerItemTitleRow">
                    <strong>{en ? skill.name : skill.nameRu}</strong>
                    <div className="buildSkillBadges">
                      <span className="buildSkillBranchBadge">
                        <GameAttribute name={skill.branch} />
                      </span>
                      <span className="buildSkillTierBadge">Тир {skill.tier}</span>
                    </div>
                  </div>

                  <p className="buildPickerItemDesc">{skill.descRu}</p>

                  <div className="buildPickerSkillMeta">
                    <span className="buildSkillManaTag">
                      {skill.type === 'active' ? '⚡ ' : '🛡️ '}
                      {skill.manaCost} {en ? 'mana' : 'маны'}
                    </span>
                    {!meetsTierReq && (
                      <span className="buildSkillTierWarn">
                        {en
                          ? `Req: ${skill.tier} branch pts (${branchPts} alloc.)`
                          : `Реком.: ${skill.tier} очк. в ветке (вложено ${branchPts})`}
                      </span>
                    )}
                    {isEquippedElsewhere && (
                      <span className="buildSkillAlreadyEquipped">
                        {en ? 'Already in loadout' : 'Уже в наборе'}
                      </span>
                    )}
                  </div>
                </div>
                {isEquippedHere && <span className="buildPickerCheck">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
