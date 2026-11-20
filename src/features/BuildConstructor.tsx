import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { battleStats, skillCooldown, skillMana, startingAttribute } from '../domain/combat';
import { GameArt } from '../ui/GameArt';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { copyLink } from '../ui/copyLink';
import { useModal } from '../ui/useModal';
import { lightHaptic } from '../telegram/client';
import { trackGuide } from './guideAnalytics';
import { useGuideLocale } from './guideLocale';
import { guideShareUrl, shareGuide } from './guideProfile';
import progression from './owl-progression.json';
import { BattleReadout, skillEffect } from './BattleReadout';
import {
  activeAttributes, applyBuildPreset, builds, combatSkills, decodeBuildCode, emptyAttributes, encodeBuildCode,
  requiredAttributes, ringCatalog, skillAvailable, skillById, statKeys, statLabels, totalAttributes,
  validateBuild, type StatKey, type BuildState, type Ring,
} from './combat-builds';
import { practiceKey, reviewBuild, type PracticeResult } from './combat-analysis';
import { OwlSkinCanvas } from './OwlSkinCanvas';
import {
  homeOwlChangeEvent, readHomeOwlSkin, sanitizeSkinSelection, scopedStorageKey, skinRarityForSelection,
  type SkinSelection,
} from './skinRig';

function readCombatOwlSkin(): SkinSelection {
  try {
    const key = scopedStorageKey('notwise.guide.skin-calc.v1');
    const raw = JSON.parse(sessionStorage.getItem(key) ?? sessionStorage.getItem('notwise.guide.skin-calc.v1') ?? 'null');
    const sessionSkin = sanitizeSkinSelection(raw?.selection, false);
    if (sessionSkin) return sessionSkin;
  } catch { /* fallback */ }
  return readHomeOwlSkin().selection;
}

type Picker = { kind: 'ring' | 'skill'; slot: number };
const maxLevel = progression.current.length - 1;
const emptySlots = [null, null, null];
const orderedSkills = [...combatSkills].sort((a, b) => a.tier - b.tier);
const skillArt = (id: number) => '/game/skills/' + id + '.png';
const ringArt = (id: string) => '/game/items/' + id + '.webp';
const ringName = (ring: Ring, lang: number) =>
  lang ? `${['Wooden', 'Obsidian', 'Golden'][ring.tier - 1]} ring · ${statLabels[ring.attribute][1]}` : ring.title;
const passive = (skill: { type: string }) => skill.type === 'passive';
const buildStorage = 'notwise.guide.combat-build.v1';

function storedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function readBuild(): BuildState {
  try {
    const key = scopedStorageKey(buildStorage);
    const saved = JSON.parse(localStorage.getItem(key) ?? localStorage.getItem(buildStorage) ?? 'null');
    if (!saved || !storedInteger(saved.level, 1, maxLevel)) return initialBuild();
    const budget = storedInteger(saved.budget, 0, 999) ? saved.budget : null;
    const attributes = (value: Record<string, unknown> | undefined) => {
      const result = { ...emptyAttributes };
      for (const stat of statKeys) {
        const input = value?.[stat];
        if (storedInteger(input, 0, 999)) result[stat] = input;
      }
      return result;
    };
    const matchedSkills = new Set<number>();
    return validateBuild({
      presetId: builds.find(build => build.id === saved.presetId)?.id,
      level: saved.level, budget, points: attributes(saved.points), buffs: attributes(saved.buffs),
      rings: emptySlots.map((_, i) => {
        const slot = saved.rings?.[i];
        const ring = ringCatalog.find(item => item.id === slot?.ring?.id);
        return ring && storedInteger(slot.enchant, 0, 20) ? { ring, enchant: slot.enchant } : null;
      }),
      skills: emptySlots.map((_, i) => {
        const slot = saved.skills?.[i];
        if (!slot || !skillById.has(slot.id) || matchedSkills.has(slot.id) || !storedInteger(slot.level, 1, 21)) return null;
        matchedSkills.add(slot.id);
        return { id: slot.id, level: slot.level };
      }),
    });
  } catch { return initialBuild(); }
}

function initialBuild(): BuildState {
  return { level: 20, budget: null, points: emptyAttributes, buffs: emptyAttributes, rings: emptySlots, skills: emptySlots };
}

function replaceSlot<T>(slots: T[], index: number, value: T) {
  return slots.map((slot, i) => i === index ? value : slot);
}

export function BuildConstructor({ referralCode }: { referralCode?: string }) {
  const { locale } = useGuideLocale();
  const lang = locale === 'en' ? 1 : 0;
  const copy = (ru: string, en: string) => lang ? en : ru;
  const { search } = useLocation();
  const navigate = useNavigate();
  const initialShared = useMemo(() => {
    const token = new URLSearchParams(search).get('build')?.split('--g_')[0];
    return token ? decodeBuildCode(token, maxLevel) : null;
  }, []);
  const [state, setState] = useState(() => initialShared ?? readBuild());
  const [sharedBanner, setSharedBanner] = useState(() => Boolean(initialShared));
  const [practice, setPractice] = useState<PracticeResult | 'waiting' | 'error' | null>(null);
  const [comparison, setComparison] = useState<PracticeResult | null>(null);
  const [showAllBuilds, setShowAllBuilds] = useState(() => {
    try { return sessionStorage.getItem('notwise.guide.builds.show-all.v1') === '1'; } catch { return false; }
  });
  const [shareOpen, setShareOpen] = useState(false);
  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    trackGuide('build:open');
  }, []);
  useEffect(() => {
    const token = new URLSearchParams(search).get('build')?.split('--g_')[0];
    if (!token) return;
    const decoded = decodeBuildCode(token, maxLevel);
    if (decoded) {
      setState(decoded);
      setSharedBanner(true);
      setPractice(null);
      setComparison(null);
    }
    navigate('/combat/builds', { replace: true });
  }, [search, navigate]);
  useEffect(() => {
    try { localStorage.setItem(scopedStorageKey(buildStorage), JSON.stringify(state)); } catch { /* Storage is optional. */ }
  }, [state]);
  useEffect(() => () => worker.current?.terminate(), []);

  const resetPractice = () => {
    worker.current?.terminate();
    worker.current = null;
    setPractice(null);
  };
  const startPractice = () => {
    lightHaptic();
    trackGuide('build:practice');
    resetPractice();
    setPractice('waiting');
    try {
      const task = new Worker(new URL('./combat-analysis.worker.ts', import.meta.url), { type: 'module' });
      worker.current = task;
      const finish = (result: PracticeResult | 'error') => {
        if (worker.current !== task) return;
        task.terminate();
        worker.current = null;
        setPractice(result);
      };
      task.onmessage = (event: MessageEvent<PracticeResult>) => finish(event.data);
      task.onerror = () => finish('error');
      task.postMessage(state);
    } catch { resetPractice(); setPractice('error'); }
  };

  const activePreset = useMemo(() => builds.find(build => {
    if (state.presetId && state.presetId !== build.id) return false;
    const preset = applyBuildPreset(build, state);
    return statKeys.every(stat => state.points[stat] === preset.points[stat]) &&
      state.rings.every((slot, i) => slot?.ring.id === preset.rings[i]?.ring.id && slot?.enchant === preset.rings[i]?.enchant) &&
      state.skills.every((slot, i) => slot?.id === preset.skills[i]?.id && slot?.level === preset.skills[i]?.level);
  })?.id, [state]);
  const [combatOwl, setCombatOwl] = useState<SkinSelection>(readCombatOwlSkin);
  useEffect(() => {
    const refresh = () => setCombatOwl(readCombatOwlSkin());
    window.addEventListener(homeOwlChangeEvent, refresh);
    return () => window.removeEventListener(homeOwlChangeEvent, refresh);
  }, []);
  const owlRarity = skinRarityForSelection(combatOwl);

  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [choosePreset, setChoosePreset] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [ringEnchantPreview, setRingEnchantPreview] = useState(0);
  const [bulkConfirmLevel, setBulkConfirmLevel] = useState<number | null>(null);
  const spent = totalAttributes(state.points);
  const budget = state.budget ?? state.level;
  const left = budget - spent;
  const selectedPreset = builds.find(build => build.id === activePreset);
  const total = activeAttributes(state);
  const results = battleStats(state.level, total.strength, total.agility, total.wisdom, total.endurance);
  const nameOf = (skill: typeof combatSkills[number]) => lang ? skill.name : skill.title;
  const equippedRingEnchants = state.rings.flatMap(slot => (slot ? [slot.enchant] : []));
  const equippedRingsCount = equippedRingEnchants.length;
  const minRingEnchant = equippedRingsCount > 0 ? Math.min(...equippedRingEnchants) : ringEnchantPreview;
  const maxRingEnchant = equippedRingsCount > 0 ? Math.max(...equippedRingEnchants) : ringEnchantPreview;
  const totalRingEnchant = equippedRingEnchants.reduce((sum, lvl) => sum + lvl, 0);
  const hasMixedRingEnchants = equippedRingsCount > 1 && minRingEnchant !== maxRingEnchant;
  const mainEnchantLevel = hasMixedRingEnchants ? (bulkConfirmLevel ?? maxRingEnchant) : maxRingEnchant;
  const nextMainTarget = Math.min(20, mainEnchantLevel + 1);
  const mainEnchantSuccess = 100 - Math.max(0, (nextMainTarget - 1) - 2) * 5;
  const mainEnchantBurn = 100 - mainEnchantSuccess;
  const mainRiskZone = mainEnchantLevel < 3 ? 'safe' : mainEnchantLevel < 10 ? 'mid' : 'high';
  const ringSlotsSummary = state.rings.map(slot => (slot ? `+${slot.enchant}` : '—')).join(' · ');

  useEffect(() => {
    if (!hasMixedRingEnchants) setBulkConfirmLevel(null);
  }, [hasMixedRingEnchants]);

  function applyMainRingEnchant(nextLvl: number) {
    const clamped = Math.max(0, Math.min(20, nextLvl));
    setRingEnchantPreview(clamped);
    setBulkConfirmLevel(null);
    if (state.rings.some(Boolean)) {
      update({
        rings: state.rings.map(slot => slot ? { ...slot, enchant: clamped } : null),
      });
    }
  }

  function requestBulkRingEnchant(nextLvl: number) {
    const clamped = Math.max(0, Math.min(20, nextLvl));
    if (hasMixedRingEnchants) {
      setBulkConfirmLevel(clamped);
      return;
    }
    applyMainRingEnchant(clamped);
  }

  const update = (change: Partial<BuildState>) => {
    trackGuide('build:edit');
    resetPractice();
    setState(current => {
      const next = { ...current, ...change };
      return selectedPreset && ('level' in change || 'budget' in change)
        ? applyBuildPreset(selectedPreset, next)
        : validateBuild(next);
    });
  };
  const updateAttribute = (stat: StatKey, getAmount: (current: number) => number) => {
    trackGuide('build:edit');
    resetPractice();
    setState(s => {
      const current = s.points[stat];
      const max = (s.budget ?? s.level) - totalAttributes(s.points) + current;
      const value = Math.min(max, Math.max(0, getAmount(current)));
      return validateBuild({ ...s, points: { ...s.points, [stat]: value } });
    });
  };
  const step = (stat: StatKey, delta: number) => {
    lightHaptic();
    updateAttribute(stat, current => current + delta);
  };

  function applyPreset(build: typeof builds[number]) {
    lightHaptic();
    trackGuide('build:preset');
    resetPractice();
    setBulkConfirmLevel(null);
    setState(applyBuildPreset(build, state));
  }

  const review = reviewBuild(state);
  const warningCount = Number(review.freePoints > 0) + Number(review.skillSlots > 0) + Number(review.ringSlots > 0)
    + Number(review.flurryWithoutHint) + review.overCap.length
    + Number(review.rotationCost > 0 && review.mana < review.rotationCost * 2);
  const statBarScale = Math.max(budget + 12, 42);

  return <div className="buildConstructor">
    <section className="card buildPanel buildLoadoutCard" aria-labelledby="build-level-title">
      <div className="buildLoadoutTop">
        <div className="buildLoadoutControls">
          <label className="buildLevelPill" aria-label={copy('Уровень совы', 'Owl level')}>
            <span>{copy('Ур.', 'Lv.')}</span>
            <select id="build-level-title" value={state.level} onChange={event => update({ level: Number(event.target.value) })}>
              {Array.from({ length: maxLevel }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
          <button type="button" className="buildPresetChip" aria-haspopup="dialog" onClick={() => { lightHaptic(); setChoosePreset(true); }}>
            {selectedPreset ? <GameAttribute name={selectedPreset.icon}/> : <GameGlyph name="sparkles"/>}
            <span>{selectedPreset ? selectedPreset.name[lang] : copy('Готовые', 'Presets')}</span>
            <span className="buildChipCaret" aria-hidden="true">▾</span>
          </button>
        </div>
        <div className="buildLoadoutRight">
          <span className="buildBudgetPill" data-empty={left === 0 || undefined}>
            {left === 0 ? copy('✓ 0 очк.', '✓ 0 pts') : copy(`Свободно: ${left}`, `Free: ${left}`)}
          </span>
          <button type="button" className="wardrobeActionIcon calcInfoBtn" title={copy('О калькуляторе билдов', 'About build calculator')}
            aria-label={copy('О калькуляторе билдов', 'About build calculator')} onClick={() => { lightHaptic(); setInfoOpen(true); }}>
            <GameGlyph name="info"/>
          </button>
          <button type="button" className="buildIconReset" title={copy('Сбросить билд', 'Reset build')}
            aria-label={copy('Сбросить билд', 'Reset build')} onClick={() => {
              lightHaptic();
              resetPractice();
              setComparison(null);
              setBudgetDraft(null);
              setSharedBanner(false);
              setRingEnchantPreview(0);
              setBulkConfirmLevel(null);
              setState(initialBuild());
            }}>↺</button>
        </div>
      </div>
      {sharedBanner && <p className="buildSharedNotice">✓ {copy('Загружена сборка по ссылке — можешь проверить в боях или подстроить под себя.', 'Shared build loaded — test in duels or tweak stats.')}</p>}

      <div className="buildLoadoutStage">
        <div className="buildLoadoutCol">
          <span className="buildLoadoutColLabel">{copy('Навыки', 'Skills')}</span>
          {state.skills.map((slot, i) => {
            const locked = state.level < 2;
            const skill = !locked && slot ? skillById.get(slot.id) : null;
            return <button key={i} type="button" className="buildLoadoutSlot"
              data-filled={Boolean(skill) || undefined}
              data-locked={locked || undefined}
              aria-haspopup="dialog"
              aria-label={skill ? nameOf(skill) : locked ? copy('Навыки со 2-го уровня', 'Skills from level 2') : copy('Выбрать навык', 'Choose skill') + ' ' + (i + 1)}
              onClick={() => { lightHaptic(); setPicker({ kind: 'skill', slot: i }); }}>
              {skill && slot ? <>
                <GameArt path={skillArt(skill.id)} size={42}/>
                <span className="buildLoadoutTag">{copy(`Ур.${slot.level}`, `Lv.${slot.level}`)}</span>
              </> : locked ? <span className="buildSlotLock">{copy('2 ур.', 'Lv.2')}</span>
                : <span className="buildSlotPlus" aria-hidden="true">+</span>}
            </button>;
          })}
        </div>

        <div className="buildLoadoutHero">
          <div className="buildLoadoutOwl" data-rarity={owlRarity}>
            <OwlSkinCanvas selection={combatOwl} size={132}/>
          </div>
          <a href="#build-results-title" className="buildLoadoutStatus" data-ok={warningCount === 0 || undefined}
            onClick={event => {
              event.preventDefault();
              lightHaptic();
              document.getElementById('build-results-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}>
            {warningCount === 0
              ? copy('✓ Баланс ОК', '✓ Balanced')
              : copy(`Советы (${warningCount})`, `Tips (${warningCount})`)}
          </a>
        </div>

        <div className="buildLoadoutCol">
          <span className="buildLoadoutColLabel">{copy('Кольца', 'Rings')}</span>
          {state.rings.map((slot, i) => {
            const locked = state.level < 5;
            const equipped = !locked ? slot : null;
            return <button key={i} type="button" className="buildLoadoutSlot"
              data-filled={Boolean(equipped) || undefined}
              data-locked={locked || undefined}
              aria-haspopup={locked ? undefined : 'dialog'}
              aria-label={equipped ? ringName(equipped.ring, lang) : locked ? copy('Кольца с 5-го уровня', 'Rings from level 5') : copy('Выбрать кольцо', 'Choose ring') + ' ' + (i + 1)}
              disabled={locked}
              onClick={() => { lightHaptic(); setPicker({ kind: 'ring', slot: i }); }}>
              {equipped ? <>
                <GameArt path={ringArt(equipped.ring.id)} size={42}/>
                <span className="buildLoadoutTag">+{equipped.enchant}</span>
              </> : locked ? <span className="buildSlotLock">{copy('5 ур.', 'Lv.5')}</span>
                : <span className="buildSlotPlus" aria-hidden="true">+</span>}
            </button>;
          })}
        </div>
      </div>

      <button type="button" className="secondary buildShareHeroBtn" onClick={() => { lightHaptic(); setShareOpen(true); }}>
        <GameGlyph name="share"/>
        <span>{copy('Поделиться сборкой', 'Share this build')}</span>
      </button>

      <div className="buildStatGrid" role="group" aria-label={copy('Распределение очков', 'Attribute points')}>
        {statKeys.map(stat => {
          const invested = state.points[stat];
          const bonus = total[stat] - invested - startingAttribute;
          const pct = Math.min(100, Math.round((total[stat] * 100) / statBarScale));
          const capped = (stat === 'agility' || stat === 'wisdom') && total[stat] > 100;
          return <div className="buildStatCard" key={stat} data-stat={stat}>
            <div className="buildStatTop">
              <span className="buildStatName"><GameAttribute name={stat}/>{statLabels[stat][lang]}</span>
              <span className="buildStatBadges">
                {capped && <span className="buildStatCap" title={copy('Потолок 70% достигнут на 100 очках', '70% cap reached at 100')}>70%</span>}
                {bonus > 0 && <span className="buildStatBonus" title={copy('Бонус от колец и баффов', 'Bonus from rings & buffs')}>+{bonus}</span>}
              </span>
            </div>
            <div className="buildStatMid">
              <div className="buildStatValueWrap">
                <AttributeInput name={copy('Без бонусов · ', 'Before bonuses · ') + statLabels[stat][lang]}
                  value={startingAttribute + invested} onCommit={value => updateAttribute(stat, () => value - startingAttribute)}/>
                {bonus > 0 && <small className="buildStatTotal">= {total[stat]}</small>}
              </div>
              <div className="buildStatStep">
                <button type="button" aria-label={copy('Уменьшить', 'Decrease') + ' · ' + statLabels[stat][lang]}
                  disabled={invested === 0} onClick={() => step(stat, -1)}>−</button>
                <button type="button" aria-label={copy('Увеличить', 'Increase') + ' · ' + statLabels[stat][lang]}
                  disabled={left === 0} onClick={() => step(stat, 1)}>+</button>
              </div>
            </div>
            <div className="buildStatBar" aria-hidden="true"><span style={{ width: `${pct}%` }}/></div>
          </div>;
        })}
      </div>

      <div className="wardrobeEnchantCard buildRingEnchantCard">
        <div className="skinEnchantBox">
          <div className="skinEnchantHead">
            <div className="skinEnchantMeta">
              <GameArt path="/game/items/scroll-enchant-ring.webp" size={28}/>
              <strong>{copy('Заточка колец', 'Ring enchant')}</strong>
            </div>
            <b className="skinEnchantBonusTag" data-mixed={hasMixedRingEnchants || undefined}>
              {hasMixedRingEnchants
                ? copy(`+${minRingEnchant}..+${maxRingEnchant} · разные`, `+${minRingEnchant}–+${maxRingEnchant} · mixed`)
                : mainEnchantLevel > 0 ? `+${mainEnchantLevel} · +${mainEnchantLevel * 5}%` : '+0%'}
            </b>
          </div>
          <div className="skinEnchantControls">
            <small className="skinEnchantHint" data-risk={hasMixedRingEnchants ? 'mid' : mainRiskZone}>
              {hasMixedRingEnchants
                ? copy(
                    `Слоты: ${ringSlotsSummary} (+${totalRingEnchant * 5}% монет). Для точечной правки открой слот.`,
                    `Slots: ${ringSlotsSummary} (+${totalRingEnchant * 5}% coins). Tap a slot to edit individually.`
                  )
                : mainEnchantLevel >= 20
                  ? copy('Максимум +20 (+20 к стату · +100% монет)', 'Max +20 (+20 stat · +100% coins)')
                  : mainEnchantBurn > 0
                    ? copy(`На +${nextMainTarget}: ${mainEnchantSuccess}% успех · ${mainEnchantBurn}% риск 🔥`, `To +${nextMainTarget}: ${mainEnchantSuccess}% ok · ${mainEnchantBurn}% burn 🔥`)
                    : copy(`На +${nextMainTarget}: 100% без сгорания`, `To +${nextMainTarget}: 100% safe`)}
            </small>
            <div className="buildStatStep skinEnchantStep">
              <button type="button" aria-label={copy('Уменьшить заточку', 'Decrease enchant')}
                disabled={hasMixedRingEnchants ? (bulkConfirmLevel !== null && bulkConfirmLevel <= 0) : mainEnchantLevel <= 0}
                onClick={() => {
                  lightHaptic();
                  if (hasMixedRingEnchants) {
                    requestBulkRingEnchant(bulkConfirmLevel === null ? minRingEnchant : bulkConfirmLevel - 1);
                  } else {
                    applyMainRingEnchant(mainEnchantLevel - 1);
                  }
                }}>−</button>
              <select className="skinEnchantSelect" aria-label={copy('Уровень заточки', 'Enchant level')}
                value={hasMixedRingEnchants ? (bulkConfirmLevel ?? '') : mainEnchantLevel}
                onChange={event => {
                  lightHaptic();
                  const level = Number(event.target.value);
                  if (hasMixedRingEnchants) requestBulkRingEnchant(level);
                  else applyMainRingEnchant(level);
                }}>
                {hasMixedRingEnchants && <option value="" disabled>≠</option>}
                {Array.from({ length: 21 }, (_, level) => <option key={level} value={level}>+{level}</option>)}
              </select>
              <button type="button" aria-label={copy('Увеличить заточку', 'Increase enchant')}
                disabled={hasMixedRingEnchants ? (bulkConfirmLevel !== null && bulkConfirmLevel >= 20) : mainEnchantLevel >= 20}
                onClick={() => {
                  lightHaptic();
                  if (hasMixedRingEnchants) {
                    requestBulkRingEnchant(bulkConfirmLevel === null ? maxRingEnchant : bulkConfirmLevel + 1);
                  } else {
                    applyMainRingEnchant(mainEnchantLevel + 1);
                  }
                }}>+</button>
            </div>
          </div>
        </div>
        {hasMixedRingEnchants && bulkConfirmLevel !== null && (
          <div className="buildRingBulkConfirm" role="region" aria-live="polite">
            <span>
              {copy(
                `Уравнять все ${equippedRingsCount} кольца на +${bulkConfirmLevel}?`,
                `Set all ${equippedRingsCount} rings to +${bulkConfirmLevel}?`
              )}
            </span>
            <div className="buildRingBulkActions">
              <button type="button" className="buildPillButton" onClick={() => { lightHaptic(); setBulkConfirmLevel(null); }}>
                {copy('Отмена', 'Cancel')}
              </button>
              <button type="button" className="buildPillButton buildEquippedDonePill" onClick={() => { lightHaptic(); applyMainRingEnchant(bulkConfirmLevel); }}>
                {copy(`Применить +${bulkConfirmLevel}`, `Apply +${bulkConfirmLevel}`)}
              </button>
            </div>
          </div>
        )}
        <div className="wardrobeRiskMeter" aria-hidden="true">
          <div className="wardrobeRiskTrack">
            <div className="wardrobeRiskFill" data-risk={mainRiskZone} style={{ width: `${(mainEnchantLevel / 20) * 100}%` }}/>
            <span className="wardrobeRiskSafeMark" style={{ left: '15%' }}/>
          </div>
          <div className="wardrobeRiskScale">
            <span>{copy('+0..+3 безопасно (100%)', '+0..+3 safe (100%)')}</span>
            <span>{copy('+4..+20 предмет может сгореть 🔥', '+4..+20 item can burn 🔥')}</span>
          </div>
        </div>
      </div>

      <details className="mediaDetails buildAdvanced" id="build-advanced">
        <summary><strong>{copy('Запас очков и баффы (осада, книга)', 'Custom budget and temporary buffs')}</strong></summary>
        <p className="caption">{copy('По умолчанию доступно 1 очко за уровень. Если у тебя другой запас или действуют усиления от осады/книги, укажи их здесь.', 'Default budget is 1 point per level. Adjust your point pool or add siege/book buffs here.')}</p>
        <label className="field">{copy('Всего очков для распределения', 'Total points to allocate')}
          <input value={budgetDraft ?? state.budget ?? ''} placeholder={String(state.level)} inputMode="numeric" maxLength={3}
            onChange={event => setBudgetDraft(event.target.value.replace(/\D/g, ''))}
            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            onBlur={() => {
              if (budgetDraft !== null) update({ budget: budgetDraft === '' ? null : Number(budgetDraft) });
              setBudgetDraft(null);
            }}/>
        </label>
        <div className="calculatorGrid">{statKeys.map(stat => <label className="field" key={stat}>
          <span><GameAttribute name={stat}/> {statLabels[stat][lang]}</span>
          <input value={state.buffs[stat] || ''} placeholder="0" inputMode="numeric" maxLength={3}
            onChange={event => update({ buffs: { ...state.buffs, [stat]: Number(event.target.value.replace(/\D/g, '')) } })}/>
        </label>)}</div>
      </details>
    </section>

    <section className="card buildPanel buildPreview" aria-labelledby="build-results-title">
      <div className="buildHeading buildPreviewHead">
        <h2 id="build-results-title">{copy('Итоги в бою и баланс', 'Combat stats & check')}</h2>
        <button type="button" className="buildPillButton" onClick={() => { lightHaptic(); setShareOpen(true); }}>
          <GameGlyph name="share"/>
          {copy('Поделиться', 'Share')}
        </button>
      </div>
      <BattleReadout stats={results}/>
      <BuildAnalysis state={state} lang={lang}/>
    </section>

    <section className="card buildPanel buildPracticeCard" aria-labelledby="build-practice-title">
      <div className="buildPracticeHead">
        <h2 id="build-practice-title">{copy('Проверка в тренировочных боях', 'Practice duel check')}</h2>
        <span className="buildWipBadge">{copy('В разработке', 'In development')}</span>
      </div>
      <p className="caption">{copy('320 авто-боёв против 4 архетипов твоего уровня (Натиск, Маг, Бастион и Яд/Уклонение). В реальном бою ещё решает выбор зон блока.', '320 auto-duels against 4 archetypes at your level. Real ranked fights also depend on zone timing.')}</p>
      {totalAttributes(state.buffs) > 0 && <p className="caption">{copy('Твои временные усиления учтены. У соперников усилений нет.', 'Your temporary buffs apply; opponents have none.')}</p>}
      <button className="primary buildAnalyze" type="button" onClick={startPractice} disabled={practice === 'waiting'}>
        <GameGlyph name="fight"/>
        {practice === 'waiting' ? copy('Проводим 320 боёв…', 'Running 320 duels…') : copy('Проверить билд в боях', 'Test build in duels')}
      </button>
      {comparison && (!practice || typeof practice === 'string') && <p className="buildComparisonStatus">
        <span>{comparison.key === practiceKey(state)
          ? copy('Эталон для сравнения сохранён — нажми «Проверить билд в боях», чтобы увидеть разницу.', 'Baseline saved — run duels to see the winrate delta.')
          : copy('Уровень или бюджет изменился; для нового сравнения сбрось старый эталон.', 'Level or budget changed; clear old baseline to compare.')}</span>
        <button className="buildPillButton" type="button" onClick={() => setComparison(null)}>{copy('Сбросить', 'Clear')}</button>
      </p>}
      <div aria-live="polite">
        {practice === 'error' && <p className="caption">{copy('Не удалось запустить бои. Попробуй ещё раз.', 'Could not start practice duels. Try again.')}</p>}
        {practice && typeof practice !== 'string' && <BuildPractice result={practice} comparison={comparison} lang={lang} state={state}
          save={() => { lightHaptic(); trackGuide('build:analyze'); setComparison(practice); }}
          clear={() => setComparison(null)}/>}
      </div>
    </section>

    <section className="card buildPanel buildGuide" aria-labelledby="build-guide-title">
      <div className="buildHeading">
        <h2 id="build-guide-title">{copy('Тактика и все 10 сборок', 'All 10 archetypes')}</h2>
        <button type="button" className="buildPillButton" onClick={() => {
          lightHaptic();
          setShowAllBuilds(open => {
            const next = !open;
            if (next) trackGuide('build:analyze');
            try { sessionStorage.setItem('notwise.guide.builds.show-all.v1', next ? '1' : '0'); } catch { /* Optional. */ }
            return next;
          });
        }}>{showAllBuilds ? copy('Свернуть', 'Hide') : copy('Показать все', 'Show all')}</button>
      </div>
      <p className="caption">{copy('Разбор сильных и слабых сторон каждой готовой сборки.', 'Strengths, weaknesses and full skill requirements for each preset.')}</p>
      {showAllBuilds && builds.map(build => {
        const requirements = requiredAttributes(build.skills);
        const adapted = applyBuildPreset(build, state);
        const fullBuild = build.skills.every(id => adapted.skills.some(slot => slot?.id === id));
        return <details className="mediaDetails buildGuideEntry" id={'build-guide-' + build.id} key={build.id}>
          <summary><GameArt path={skillArt(build.signature)} size={33}/><span><strong>{build.name[lang]}</strong><small>{build.role[lang]}</small></span></summary>
          <p>{build.play[lang]}</p>
          <p className="buildGuideTradeoff"><strong>{copy('Слабое место', 'Weak spot')}</strong> {build.tradeoff[lang]}</p>
          <div className="buildGuideSkills">{build.skills.map(id => {
            const skill = skillById.get(id)!;
            return <span key={id}><GameArt path={skillArt(id)} size={22}/>{nameOf(skill)}</span>;
          })}</div>
          <dl className="buildGuideGear">
            <div><dt>{copy('Очки для трёх навыков', 'Points for all three skills')}</dt><dd>{statKeys.filter(stat => requirements[stat] > 0).map(stat => statLabels[stat][lang] + ' ' + requirements[stat]).join(' · ')}</dd></div>
            <div><dt>{copy('Кольца по слотам', 'Rings by slot')}</dt><dd>{build.rings.map(stat => statLabels[stat][lang]).join(' · ')}</dd></div>
          </dl>
          {!fullBuild && <p className="caption">{copy('На твоём уровне применится стартовый вариант.', 'Your level uses the starter version.')}</p>}
          <button className="secondary" type="button" onClick={() => applyPreset(build)}>{copy('Применить эту сборку', 'Apply build')}</button>
        </details>;
      })}
    </section>

    {choosePreset && <BuildPicker title={copy('Готовые сборки', 'Preset builds')} closeLabel={copy('Закрыть', 'Close')} onClose={() => setChoosePreset(false)}>
      {requestClose => <>
        <p className="caption buildPresetNote">{copy('Сборка подставит очки, кольца и навыки под твой уровень.', 'Preset fills points, rings and skills for your current level.')}</p>
        <div className="buildPickerOptions">
          {builds.map(build => <PickerOption key={build.id} art={skillArt(build.signature)}
            title={build.name[lang]} meta={build.role[lang]} selected={selectedPreset?.id === build.id} disabled={false}
            onSelect={() => { applyPreset(build); requestClose(); }}/>)}
        </div>
      </>}
    </BuildPicker>}

    {picker && <BuildPicker key={picker.kind} title={picker.kind === 'ring' ? copy('Слот кольца ', 'Ring slot ') + (picker.slot + 1) : copy('Слот навыка ', 'Skill slot ') + (picker.slot + 1)}
      closeLabel={copy('Закрыть', 'Close')} onClose={() => setPicker(null)}>
      {requestClose => <div className="buildPickerOptions">
        {picker.kind === 'ring' && state.rings[picker.slot] && (() => {
          const equipped = state.rings[picker.slot]!;
          const ringNext = Math.min(20, equipped.enchant + 1);
          const ringSuccess = 100 - Math.max(0, (ringNext - 1) - 2) * 5;
          const ringBurn = 100 - ringSuccess;
          const ringRisk = equipped.enchant < 3 ? 'safe' : equipped.enchant < 10 ? 'mid' : 'high';
          return <div className="buildEquippedCard">
            <div className="buildEquippedTop">
              <GameArt path={ringArt(equipped.ring.id)} size={40}/>
              <div>
                <strong>{ringName(equipped.ring, lang)}</strong>
                <small>+{equipped.ring.bonus + equipped.enchant} {copy('к ', 'to ')}{statLabels[equipped.ring.attribute][lang].toLowerCase()}</small>
              </div>
              <button className="buildPillButton" type="button" onClick={() => {
                lightHaptic();
                update({ rings: replaceSlot(state.rings, picker.slot, null) });
                requestClose();
              }}>{copy('Снять', 'Remove')}</button>
            </div>
            <div className="skinEnchantBox buildModalEnchantBox">
              <div className="skinEnchantHead">
                <div className="skinEnchantMeta">
                  <strong>{copy('Заточка кольца', 'Ring enchant')}</strong>
                </div>
                <b className="skinEnchantBonusTag">+{equipped.enchant} · +{equipped.enchant * 5}%</b>
              </div>
              <div className="skinEnchantControls">
                <small className="skinEnchantHint" data-risk={ringRisk}>
                  {equipped.enchant >= 20
                    ? copy('Максимум +20 (+100% монет)', 'Max +20 (+100% coins)')
                    : ringBurn > 0
                      ? copy(`На +${ringNext}: ${ringSuccess}% успех · ${ringBurn}% риск 🔥`, `To +${ringNext}: ${ringSuccess}% ok · ${ringBurn}% burn 🔥`)
                      : copy(`На +${ringNext}: 100% без сгорания`, `To +${ringNext}: 100% safe`)}
                </small>
                <div className="buildStatStep skinEnchantStep">
                  <button type="button" aria-label={copy('Уменьшить заточку', 'Decrease enchant')}
                    disabled={equipped.enchant <= 0}
                    onClick={() => {
                      lightHaptic();
                      update({ rings: replaceSlot(state.rings, picker.slot, { ...equipped, enchant: Math.max(0, equipped.enchant - 1) }) });
                    }}>−</button>
                  <select className="skinEnchantSelect" aria-label={copy('Заточка кольца', 'Ring enchant')}
                    value={equipped.enchant}
                    onChange={event => {
                      lightHaptic();
                      update({ rings: replaceSlot(state.rings, picker.slot, { ...equipped, enchant: Number(event.target.value) }) });
                    }}>
                    {Array.from({ length: 21 }, (_, level) => <option key={level} value={level}>+{level}</option>)}
                  </select>
                  <button type="button" aria-label={copy('Увеличить заточку', 'Increase enchant')}
                    disabled={equipped.enchant >= 20}
                    onClick={() => {
                      lightHaptic();
                      update({ rings: replaceSlot(state.rings, picker.slot, { ...equipped, enchant: Math.min(20, equipped.enchant + 1) }) });
                    }}>+</button>
                </div>
              </div>
            </div>
            <div className="wardrobeRiskMeter" aria-hidden="true">
              <div className="wardrobeRiskTrack">
                <div className="wardrobeRiskFill" data-risk={ringRisk} style={{ width: `${(equipped.enchant / 20) * 100}%` }}/>
                <span className="wardrobeRiskSafeMark" style={{ left: '15%' }}/>
              </div>
              <div className="wardrobeRiskScale">
                <span>{copy('+0..+3 безопасно', '+0..+3 safe')}</span>
                <span>{copy('+4..+20 риск сгорания 🔥', '+4..+20 burn risk 🔥')}</span>
              </div>
            </div>
            <button className="buildPillButton buildEquippedDonePill buildEquippedConfirmBtn" type="button" onClick={() => { lightHaptic(); requestClose(); }}>
              {copy('Готово', 'Done')}
            </button>
          </div>;
        })()}
        {picker.kind === 'skill' && state.skills[picker.slot] && (() => {
          const equipped = state.skills[picker.slot]!;
          const skill = skillById.get(equipped.id);
          return skill ? <div className="buildEquippedCard">
            <div className="buildEquippedTop">
              <GameArt path={skillArt(skill.id)} size={40}/>
              <div>
                <strong>{nameOf(skill)}</strong>
                <small>{skillMana(skill.tier, passive(skill), skill.id === 10)} {passive(skill)
                  ? copy('маны за срабатывание', 'mana / trigger')
                  : copy('маны · откат ', 'mana · ') + skillCooldown(skill.tier) + copy('с', ' s')}</small>
              </div>
              <button className="buildPillButton" type="button" onClick={() => {
                lightHaptic();
                update({ skills: replaceSlot(state.skills, picker.slot, null) });
                requestClose();
              }}>{copy('Снять', 'Remove')}</button>
            </div>
            <p className="buildEquippedEffect">{skillEffect(skill.id, equipped.level, state.level, lang).map(row => row.join(' ')).join(' · ')}</p>
            <div className="skinEnchantBox buildModalEnchantBox">
              <div className="skinEnchantHead">
                <div className="skinEnchantMeta">
                  <strong>{copy('Уровень навыка в Додзё', 'Dojo skill level')}</strong>
                </div>
                <b className="skinEnchantBonusTag">{copy(`Ур. ${equipped.level} / 21`, `Lv. ${equipped.level} / 21`)}</b>
              </div>
              <div className="skinEnchantControls">
                <div className="buildStatStep skinEnchantStep">
                  <button type="button" aria-label={copy('Уменьшить уровень', 'Decrease level')}
                    disabled={equipped.level <= 1}
                    onClick={() => {
                      lightHaptic();
                      update({ skills: replaceSlot(state.skills, picker.slot, { ...equipped, level: Math.max(1, equipped.level - 1) }) });
                    }}>−</button>
                  <input aria-label={copy('Уровень навыка', 'Skill level')}
                    value={equipped.level} inputMode="numeric" maxLength={2}
                    onChange={event => {
                      const digits = event.target.value.replace(/\D/g, '');
                      const val = digits ? Math.min(21, Math.max(1, Number(digits))) : 1;
                      update({ skills: replaceSlot(state.skills, picker.slot, { ...equipped, level: val }) });
                    }}/>
                  <button type="button" aria-label={copy('Увеличить уровень', 'Increase level')}
                    disabled={equipped.level >= 21}
                    onClick={() => {
                      lightHaptic();
                      update({ skills: replaceSlot(state.skills, picker.slot, { ...equipped, level: Math.min(21, equipped.level + 1) }) });
                    }}>+</button>
                </div>
              </div>
            </div>
            <button className="buildPillButton buildEquippedDonePill buildEquippedConfirmBtn" type="button" onClick={() => { lightHaptic(); requestClose(); }}>
              {copy('Готово', 'Done')}
            </button>
          </div> : null;
        })()}
        {picker.kind === 'ring' ? ringCatalog.map(ring => {
          const locked = ring.minLevel > state.level;
          return <PickerOption key={ring.id} art={ringArt(ring.id)} title={ringName(ring, lang)}
            meta={'+' + ring.bonus + ' · ' + statLabels[ring.attribute][lang] + ' · ' + copy('с уровня ', 'level ') + ring.minLevel}
            disabled={locked} selected={state.rings[picker.slot]?.ring.id === ring.id} onSelect={button => {
              lightHaptic();
              const equipped = state.rings[picker.slot];
              update({ rings: replaceSlot(state.rings, picker.slot, equipped?.ring.id === ring.id ? equipped : { ring, enchant: ringEnchantPreview }) });
              button.closest('.dialogBody')?.scrollTo({ top: 0, behavior: 'smooth' });
            }}/>;
        }) : <SkillPickerOptions state={state} slot={picker.slot} lang={lang} onSelect={(id, button) => {
          lightHaptic();
          const equipped = state.skills[picker.slot];
          update({ skills: replaceSlot(state.skills, picker.slot, equipped?.id === id ? equipped : { id, level: 1 }) });
          button.closest('.dialogBody')?.scrollTo({ top: 0, behavior: 'smooth' });
        }}/>}
      </div>}
    </BuildPicker>}

    {infoOpen && <BuildPicker
      title={copy('Зачем нужен калькулятор билдов', 'Why use the build calculator')}
      closeLabel={copy('Закрыть', 'Close')}
      onClose={() => setInfoOpen(false)}>
      {requestClose => <div className="calcInfoSheetBody">
        <p>{copy(
          'Калькулятор точно повторяет боевую математику NOT Wise: показывает, как очки характеристик, навыки, кольца и баффы влияют на HP, ману, урон, уклонение и крит в PvP-боях и рейдах.',
          'The calculator mirrors NOT Wise combat math: see how attributes, skills, rings and buffs affect HP, mana, hit damage, dodge and crit in PvP duels and raids.',
        )}</p>
        <div className="calcInfoList">
          <div>
            <strong>{copy('1. Четыре характеристики и потолок 70%', '1. Four attributes & 70% cap')}</strong>
            <p>{copy('Сила увеличивает обычный удар, Выносливость даёт +2 HP за очко, Ловкость даёт +0,7% уклонения (максимум 70% на 100 очках), Мудрость даёт +20 маны и +0,7% шанса крита ×2 (потолок крита — 70% на 100 очках).', 'Strength raises basic hit, Endurance grants +2 HP/pt, Agility grants +0.7% dodge (capped at 70% at 100 pts), Wisdom grants +20 mana and +0.7% crit ×2 (capped at 70% at 100 pts).')}</p>
          </div>
          <div>
            <strong>{copy('2. Навыки и очки SP', '2. Skills & SP points')}</strong>
            <p>{copy('Чтобы открыть навык в ветке, вложи в неё нужное число базовых очков (от 1 до 5). Каждый навык прокачивается в Додзё с 1 до 21 уровня за SP.', 'Invest 1–5 base points into a branch to unlock its skills. Each skill upgrades in the Dojo from level 1 to 21 using SP.')}</p>
          </div>
          <div>
            <strong>{copy('3. Кольца, заточка и баффы', '3. Rings, enchanting & buffs')}</strong>
            <p>{copy('До 3 колец (с 5, 10 и 20 ур.) дают от +2 до +10 к стату. Каждая ступень заточки кольца добавляет ещё +1 к стату и +5% к монетам (до +3 без риска, с +4 кольцо может сгореть в скорлупу).', 'Equip up to 3 rings (+2 to +10 stat). Each ring enchant adds +1 stat and +5% coin bonus (safe up to +3, burn risk from +4).')}</p>
          </div>
        </div>
        <button type="button" className="secondary calcInfoDoneBtn" onClick={requestClose}>
          {copy('Понятно', 'Got it')}
        </button>
      </div>}
    </BuildPicker>}

    {shareOpen && <BuildShareDialog state={state} lang={lang} presetName={selectedPreset?.name[lang]}
      referralCode={referralCode} close={() => setShareOpen(false)}/>}
  </div>;
}

function BuildShareDialog({ state, lang, presetName, referralCode, close }: {
  state: BuildState; lang: number; presetName?: string; referralCode?: string; close: () => void;
}) {
  const copy = (ru: string, en: string) => lang ? en : ru;
  const field = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState('');
  const code = encodeBuildCode(state);
  const startapp = referralCode ? `${code}--${referralCode}` : code;
  const url = `${guideShareUrl().split('?')[0]}?startapp=${startapp}`;
  const total = activeAttributes(state);
  const summary = lang
    ? `NOT Wise build (${presetName ? `${presetName}, ` : ''}Lv.${state.level}): STR ${total.strength} · AGI ${total.agility} · END ${total.endurance} · WIS ${total.wisdom}`
    : `Сборка в NOT Wise (${presetName ? `${presetName}, ` : ''}${state.level} ур.): Сил ${total.strength} · Ловк ${total.agility} · Вын ${total.endurance} · Мдр ${total.wisdom}`;

  async function copyUrl() {
    lightHaptic();
    const ok = await copyLink(url, field.current);
    if (ok) trackGuide('build:share');
    setFeedback(ok ? copy('Ссылка на сборку скопирована.', 'Build link copied.')
      : copy('Ссылка выделена — нажми «Копировать».', 'Link selected — tap Copy.'));
  }

  return <BuildPicker title={copy('Поделиться сборкой', 'Share build')} closeLabel={copy('Закрыть', 'Close')} onClose={close}>
    {requestClose => <div className="buildShareBody">
      <p className="buildShareSummary">{summary}</p>
      <label className="field shareLink">
        <span className="sr-only">{copy('Ссылка на сборку', 'Build link')}</span>
        <input ref={field} readOnly value={url} onFocus={event => event.currentTarget.select()}/>
      </label>
      <div className="buildShareActions">
        <button className="primary" type="button" onClick={() => {
          lightHaptic();
          trackGuide('build:share');
          void shareGuide(url, summary);
          requestClose();
        }}>{copy('Отправить в Telegram', 'Send in Telegram')}</button>
        <button className="secondary" type="button" onClick={() => void copyUrl()}>
          {copy('Скопировать ссылку', 'Copy link')}
        </button>
      </div>
      {feedback && <p className="supportStatus" role="status">{feedback}</p>}
    </div>}
  </BuildPicker>;
}

function AttributeInput({ name, value, onCommit }: { name: string; value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return <input aria-label={name} inputMode="numeric" maxLength={4} value={draft ?? value}
    onFocus={event => event.currentTarget.select()}
    onChange={event => setDraft(event.target.value.replace(/\D/g, ''))}
    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
    onBlur={() => {
      if (draft !== null) onCommit(Number(draft));
      setDraft(null);
    }}/>;
}

const buildSheetEasing = 'cubic-bezier(0.32, 0.72, 0, 1)';
const buildSheetReduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function BuildPicker({ title, closeLabel, onClose, children }: {
  title: string; closeLabel: string; onClose: () => void; children: ReactNode | ((requestClose: () => void) => ReactNode);
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const animation = useRef<Animation | null>(null);
  const titleId = useId();
  useModal(ref, true);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.animate !== 'function' || buildSheetReduceMotion()) return;
    animation.current = dialog.animate([{ translate: '0 100%' }, { translate: '0 0' }],
      { duration: 460, easing: buildSheetEasing });
    return () => animation.current?.cancel();
  }, []);

  function close() {
    const dialog = ref.current;
    if (!dialog || dialog.dataset.closing) return;
    const from = getComputedStyle(dialog).translate;
    animation.current?.cancel();
    if (typeof dialog.animate !== 'function' || buildSheetReduceMotion()) { onClose(); return; }
    dialog.dataset.closing = 'true';
    animation.current = dialog.animate([{ translate: from }, { translate: '0 100%' }],
      { duration: 360, easing: buildSheetEasing, fill: 'forwards' });
    animation.current.finished.then(onClose, () => {});
  }

  return <dialog className="modal buildPickerModal" ref={ref} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="dialogBody">
      <span className="sheetGrabber" aria-hidden="true"/>
      <header className="buildHeading"><h2 id={titleId} data-dialog-title tabIndex={-1}>{title}</h2>
        <button className="close" type="button" aria-label={closeLabel} onClick={() => { lightHaptic(); close(); }}>×</button></header>
      {typeof children === 'function' ? children(close) : children}
    </div>
  </dialog>;
}

function SkillPickerOptions({ state, slot, lang, onSelect }: { state: BuildState; slot: number; lang: number; onSelect: (id: number, button: HTMLButtonElement) => void }) {
  const [branch, setBranch] = useState<StatKey>(() => {
    const equipped = state.skills[slot];
    return (equipped && skillById.get(equipped.id)?.branch) || statKeys.find(stat => state.points[stat] > 0) || 'strength';
  });
  return <>
    {state.level < 2 && <p className="caption">
      {lang ? 'To equip a skill, set the owl to level 2 or higher in the calculator.'
        : 'Чтобы экипировать навык, выставь в калькуляторе уровень совы 2 или выше.'}
    </p>}
    <div className="buildBranchFilter choiceBar" role="group" aria-label={lang ? 'Skill branches' : 'Ветки навыков'}>
      {statKeys.map(stat => <button key={stat} type="button" aria-pressed={branch === stat} onClick={() => setBranch(stat)}>
        <GameAttribute name={stat}/>{statLabels[stat][lang]}
      </button>)}
    </div>
    {orderedSkills.filter(skill => skill.branch === branch).map(skill => {
      const selected = state.skills[slot]?.id === skill.id;
      const used = !selected && state.skills.some(item => item?.id === skill.id);
      const available = skillAvailable(skill.id, state);
      const need = skill.tier - state.points[branch];
      const requirement = state.level < 2 ? (lang ? 'From owl level 2' : 'Со 2-го уровня совы')
        : lang ? `Invest +${need} more in ${statLabels[branch][lang]}` : `Нужно ещё +${need} очк. в ветку`;
      return <PickerOption key={skill.id} art={skillArt(skill.id)} title={lang ? skill.name : skill.title}
        meta={used ? (lang ? 'Already equipped' : 'Уже в наборе') : available ? (lang ? skill.effect.split('.')[0].replace(/\{[^|}]+\|([^}]+)\}/g, '$1').replace(/\{[^}]+\}/g, '…') : skill.summary) : requirement}
        disabled={used || !available} selected={selected} onSelect={button => onSelect(skill.id, button)}/>;
    })}
  </>;
}

function PickerOption({ art, title, meta, disabled, selected, onSelect }: {
  art: string; title: string; meta: string; disabled: boolean; selected: boolean; onSelect: (button: HTMLButtonElement) => void;
}) {
  return <button className="buildPickerOption" aria-pressed={selected} disabled={disabled} type="button" onClick={event => onSelect(event.currentTarget)}>
    <GameArt path={art} size={36}/><span><strong>{title}</strong><small>{meta}</small></span>
    <span className="buildPickerCheck" aria-hidden="true">{selected ? '✓' : ''}</span>
  </button>;
}

function BuildAnalysis({ state, lang }: { state: BuildState; lang: number }) {
  const copy = (ru: string, en: string) => lang ? en : ru;
  const review = reviewBuild(state);
  const notes: { title: string; detail: string }[] = [];
  if (review.freePoints > 0) notes.push({
    title: copy('Есть свободные очки', 'Unspent points'),
    detail: copy(`Осталось ${review.freePoints} очк. Мудрость даёт ману и крит, ловкость — уклонение, выносливость — HP.`,
      `${review.freePoints} ${review.freePoints === 1 ? 'point' : 'points'} left. Wisdom adds mana & crit, Agility adds dodge, Endurance adds HP.`),
  });
  if (review.skillSlots > 0) notes.push({
    title: review.skillSlots === 1
      ? copy('Свободный слот навыка', 'Empty skill slot')
      : copy('Свободные слоты навыков', 'Empty skill slots'),
    detail: copy(
      `Можно поставить ещё ${review.skillSlots} ${review.skillSlots === 1 ? 'навык' : 'навыка'} из открытых веток.`,
      `You can equip ${review.skillSlots} more unlocked ${review.skillSlots === 1 ? 'skill' : 'skills'}.`,
    ),
  });
  if (review.ringSlots > 0) notes.push({
    title: review.ringSlots === 1
      ? copy('Пустой слот кольца', 'Empty ring slot')
      : copy('Пустые слоты колец', 'Empty ring slots'),
    detail: copy(
      `Свободно слотов колец: ${review.ringSlots}. Добавь кольца под нужную ветку.`,
      `${review.ringSlots} empty ring ${review.ringSlots === 1 ? 'slot' : 'slots'}.`,
    ),
  });
  if (review.flurryWithoutHint) notes.push({
    title: copy('Berserk Howl без фиксации блока', 'Berserk Howl without guard lock'),
    detail: copy('Бей Berserk Howl сразу после попадания, либо добавь Crippling Chains / Spirit Guidance.',
      'Cast Howl right after hitting an open zone, or pair with Chains / Spirit Guidance.'),
  });
  if (review.overCap.includes('agility')) notes.push({
    title: copy('Уклонение упёрлось в потолок 70%', 'Dodge is capped at 70%'),
    detail: review.movableAgility > 0
      ? copy(`До ${review.movableAgility} очк. ловкости можно перекинуть в другой стат без потери уклонения.`,
        `Up to ${review.movableAgility} Agility ${review.movableAgility === 1 ? 'point' : 'points'} can be moved elsewhere without losing dodge.`)
      : copy('Выше 100 ловкости уклонение не растёт — проверь вклад колец и баффов.',
        'Dodge stops scaling at 100 Agility; check rings and buffs.'),
  });
  if (review.overCap.includes('wisdom')) notes.push({
    title: copy('Крит упёрся в потолок 70%', 'Crit capped at 70%'),
    detail: copy('Сверх 100 мудрости растёт только запас маны (+20 за очко).',
      'Above 100 Wisdom, only your mana pool (+20 per point) increases.'),
  });
  if (review.rotationCost > 0 && review.mana < review.rotationCost * 2) notes.push({
    title: copy('Маны меньше чем на 2 круга', 'Mana covers under 2 rotations'),
    detail: copy(`Запас ${review.mana}, а один круг активных навыков стоит ${review.rotationCost}. В бою мана не восстанавливается.`,
      `Pool is ${review.mana} and one full rotation costs ${review.rotationCost}. Mana does not regenerate in battle.`),
  });
  const rotations = review.rotationCost > 0 ? Math.floor(review.mana / review.rotationCost) : null;
  return <div className="buildAnalysis">
    {rotations !== null && <div className="buildManaSummary">
      <span>{copy('Мана на бой', 'Battle mana')}</span>
      <strong>{review.mana} · {copy(`хватит на ${rotations} кр.`, `${rotations} ${rotations === 1 ? 'full cast' : 'full casts'}`)}</strong>
    </div>}
    {review.hasPassives && <p className="caption">{copy('Пассивные навыки тоже тратят ману при каждом срабатывании.', 'Passive skills spend mana on every trigger.')}</p>}
    {notes.length > 0 ? <ul className="buildAdvice">{notes.map(note =>
      <li key={note.title}><strong>{note.title}</strong><p>{note.detail}</p></li>)}</ul>
      : <p className="buildOkNote">✓ {copy('Очки, слоты и запас маны сбалансированы.', 'Points, slots and mana pool look balanced.')}</p>}
  </div>;
}

function BuildPractice({ result, comparison, lang, save, clear, state }: {
  result: PracticeResult; comparison: PracticeResult | null; lang: number; save: () => void; clear: () => void; state: BuildState;
}) {
  const copy = (ru: string, en: string) => lang ? en : ru;
  const prior = comparison?.key === result.key && comparison !== result ? comparison : null;
  const pct = (wins: number, trials: number) => Math.round(wins * 100 / trials);
  const totalWins = result.matchups.reduce((sum, row) => sum + row.wins, 0);
  const totalTrials = result.matchups.reduce((sum, row) => sum + row.trials, 0);
  const overall = pct(totalWins, totalTrials);
  const priorOverall = prior ? pct(prior.matchups.reduce((s, r) => s + r.wins, 0), prior.matchups.reduce((s, r) => s + r.trials, 0)) : null;
  const deltaOverall = priorOverall !== null ? overall - priorOverall : null;

  const weakest = result.matchups.reduce((weak, row) => row.wins < weak.wins ? row : weak);
  const hasSkill = (id: number) => state.skills.some(slot => slot?.id === id);
  const experiments: Record<string, string> = {
    stun: hasSkill(20) ? copy('Lightning проходит через блок и уклонение. В реальном бою прибереги Phase Shift на её применение.', 'Lightning goes through guard and dodge. In a real fight, save Phase Shift for that cast.')
      : copy('Сравни вариант с большим запасом HP или Phase Shift. Lightning проходит через блок и уклонение.', 'Try more HP or Phase Shift. Lightning goes through guard and dodge.'),
    bastion: state.rings.every(slot => slot?.ring.attribute === 'wisdom')
      ? copy('Все кольца уже дают ману. Попробуй более дешёвый активный навык для затяжного боя.', 'All your rings already add mana. Try a cheaper active skill for drawn-out duels.')
      : copy('Попробуй увеличить запас маны, заменив одно кольцо на кольцо мудрости.', 'Try more mana by swapping one ring for a Wisdom ring.'),
    dodge: [1, 6, 11, 12, 16].some(hasSkill)
      ? copy('У тебя уже есть урон сквозь уклонение. Проверь запас маны для повторного применения.', 'You already have direct damage that bypasses dodge. Check mana for repeat casts.')
      : copy('Против высокого уклонения хорошо работают Lightning или Asteroid.', 'Try an ability that bypasses dodge, such as Lightning or Asteroid.'),
    assault: hasSkill(9) || hasSkill(6)
      ? copy('У тебя уже есть ответ на частые удары. Прибереги его под серию соперника.', 'You already have an answer to frequent hits. Save it for enemy combos.')
      : copy('Попробуй Static Shield для ответного урона или Snowball для замедления атак.', 'Try Static Shield for retaliation, or Snowball to slow attacks.'),
  };
  const verdict = overall >= 58 ? copy('Выше базы', 'Above meta') : overall >= 48 ? copy('На равных с метой', 'Even with meta') : copy('Сложные матчапы', 'Tough matchups');
  const canCompareFullBuilds = state.level >= 5 && (state.budget ?? state.level) >= 8;
  return <div className="buildPracticeResult">
    <div className="buildOverallWinrate">
      <div>
        <small>{copy('Спарринг с 4 эталонами · ', 'Vs 4 meta presets · ')}<span className="buildVerdict" data-tier={overall >= 58 ? 'high' : overall >= 48 ? 'mid' : 'low'}>{verdict}</span></small>
        <p className="caption">
          {result.skillLevel !== undefined && copy(`Навыки врагов ${result.skillLevel} ур.`, `Opponent skills lvl ${result.skillLevel}`)}
          {result.enchant !== undefined && copy(` · заточка +${result.enchant}`, ` · +${result.enchant}`)}
          {copy(' (50% = уровень меты)', ' (50% = meta parity)')}
        </p>
      </div>
      <div className="buildOverallValue">
        <strong>{overall}%</strong>
        {deltaOverall !== null && deltaOverall !== 0 && (
          <span className={deltaOverall > 0 ? 'buildDeltaUp' : 'buildDeltaDown'}>
            {deltaOverall > 0 ? `+${deltaOverall}%` : `${deltaOverall}%`}
          </span>
        )}
      </div>
    </div>
    <dl className="buildMatchups">
      {result.matchups.map(row => {
        const previous = prior?.matchups.find(item => item.id === row.id);
        const defeats = row.trials - row.wins - row.draws;
        const winPct = pct(row.wins, row.trials);
        const prevPct = previous ? pct(previous.wins, previous.trials) : null;
        return <div key={row.id}>
          <dt><strong>{builds.find(build => build.id === row.id)?.name[lang]}</strong>
            <small>{copy(`Побед ${row.wins} · поражений ${defeats}`, `Wins ${row.wins} · losses ${defeats}`)}
              {row.draws > 0 && copy(` · ничьих ${row.draws}`, ` · draws ${row.draws}`)}</small>
            <span className="buildWinBar" aria-hidden="true"><span style={{ width: `${winPct}%` }}/></span>
          </dt>
          <dd>{winPct}%{prevPct !== null && <small>{copy('было', 'was')} {prevPct}%</small>}</dd>
        </div>;
      })}
    </dl>
    {canCompareFullBuilds && weakest.wins * 5 < weakest.trials * 2 && <p className="buildPracticeHint">
      <strong>{copy('Что можно усилить', 'What to improve')}</strong>
      {experiments[weakest.id]}
    </p>}
    <div className="actionPair">
      <button className="secondary buildRunPractice" type="button" onClick={save} disabled={comparison === result}>
        {comparison === result ? copy('✓ Запомнено как эталон', '✓ Saved as baseline') : copy('Запомнить для сравнения', 'Save for comparison')}
      </button>
      {comparison && <button className="buildPillButton" type="button" onClick={clear}>{copy('Сбросить', 'Clear')}</button>}
    </div>
  </div>;
}
