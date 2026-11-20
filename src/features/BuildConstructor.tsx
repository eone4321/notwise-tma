import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { battleStats, skillCooldown, skillMana, startingAttribute } from '../domain/combat';
import { GameArt } from '../ui/GameArt';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { useModal } from '../ui/useModal';
import { lightHaptic } from '../telegram/client';
import { trackGuide } from './guideAnalytics';
import { useGuideLocale } from './guideLocale';
import progression from './owl-progression.json';
import { BattleReadout, skillEffect } from './BattleReadout';
import {
  activeAttributes, applyBuildPreset, builds, combatSkills, emptyAttributes, requiredAttributes, ringCatalog,
  skillAvailable, skillById, statKeys, statLabels, totalAttributes, type StatKey, type BuildState, type Ring,
} from './combat-builds';

import { practiceKey, reviewBuild, type PracticeResult } from './combat-analysis';

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
    const saved = JSON.parse(localStorage.getItem(buildStorage) ?? 'null');
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

function validateBuild(state: BuildState): BuildState {
  const points = { ...state.points };
  let excess = totalAttributes(points) - (state.budget ?? state.level);
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

export function BuildConstructor() {
  const { locale } = useGuideLocale();
  const lang = locale === 'en' ? 1 : 0;
  const copy = (ru: string, en: string) => lang ? en : ru;
  const [state, setState] = useState(readBuild);
  const [showReview, setShowReview] = useState(false);
  const [practice, setPractice] = useState<PracticeResult | 'waiting' | 'error' | null>(null);
  const [comparison, setComparison] = useState<PracticeResult | null>(null);
  const worker = useRef<Worker | null>(null);
  useEffect(() => {
    trackGuide('build:open');
  }, []);
  useEffect(() => {
    try { localStorage.setItem(buildStorage, JSON.stringify(state)); } catch { /* Storage is optional. */ }
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
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [choosePreset, setChoosePreset] = useState(false);
  const levelRef = useRef<HTMLSelectElement>(null);
  const guideRef = useRef<HTMLHeadingElement>(null);
  const spent = totalAttributes(state.points);
  const budget = state.budget ?? state.level;
  const left = budget - spent;
  const selectedPreset = builds.find(build => build.id === activePreset);
  const total = activeAttributes(state);
  const results = battleStats(state.level, total.strength, total.agility, total.wisdom, total.endurance);
  const nameOf = (skill: typeof combatSkills[number]) => lang ? skill.name : skill.title;
  const jumpTo = (element: HTMLElement | null) => {
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'start' });
  };
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

  function applyPreset(build: typeof builds[number], returnToLevel = false) {
    lightHaptic();
    trackGuide('build:preset');
    resetPractice();
    setState(applyBuildPreset(build, state));
    if (returnToLevel) jumpTo(levelRef.current);
  }

  return <div className="buildConstructor">
    <section className="card buildPanel" aria-labelledby="build-level-title">
      <div className="buildHeading">
        <h2 id="build-level-title">{copy('Калькулятор билда', 'Build calculator')}</h2>
        <button type="button" className="buildTextButton" onClick={() => {
          lightHaptic();
          resetPractice();
          setShowReview(false);
          setComparison(null);
          setBudgetDraft(null);
          setState(initialBuild());
        }}>{copy('Сбросить', 'Reset')}</button>
      </div>
      <div className="buildSetup">
        <label className="field">{copy('Уровень совы', 'Owl level')}
          <select ref={levelRef} value={state.level} onChange={event => update({ level: Number(event.target.value) })}>
            {Array.from({ length: maxLevel }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <div className="buildBudget"><small>{copy('Свободные очки', 'Unspent points')}</small><strong>{left} <small>/ {budget}</small></strong></div>
      </div>

      <div className="buildPresetBar">
        <button className="buildEquipMain buildPresetTrigger" type="button" aria-haspopup="dialog" onClick={() => { lightHaptic(); setChoosePreset(true); }}>
          {selectedPreset ? <GameAttribute name={selectedPreset.icon}/> : <GameGlyph name="fight"/>}
          <span><strong>{selectedPreset ? selectedPreset.name[lang] : copy('Готовые сборки', 'Preset builds')}</strong>
            <small>{selectedPreset ? copy('Выбрать другую сборку', 'Choose another build') : copy('Подобрать под уровень совы', 'Choose for your owl level')}</small></span>
          <span className="rowChevron" aria-hidden="true"/>
        </button>
        <button className="buildTextButton buildGuideLink" type="button" onClick={() => { lightHaptic(); jumpTo(guideRef.current); }}>{copy('Руководство', 'Build guide')}</button>
      </div>

      <div className="buildAllocationHeading"><h3>{copy('Распределение очков', 'Allocate points')}</h3>
        <p className="caption">{copy('Введи значения без колец и усилений. Числа слева учитывают все бонусы.', 'Enter the values before rings and buffs. The numbers on the left include all bonuses.')}</p>
      </div>
      <div className="buildAttributes">
        {statKeys.map(stat => {
          const bonus = total[stat] - state.points[stat] - startingAttribute;
          return <div className="buildAttributeRow" key={stat}>
            <GameAttribute name={stat}/>
            <span><strong>{statLabels[stat][lang]} <output aria-label={copy('Итого', 'Total') + ' · ' + statLabels[stat][lang]}>{total[stat]}</output></strong>
              <small>{startingAttribute} {copy('база', 'base')} + {state.points[stat]} {copy('вложено', 'invested')}{bonus > 0 && ` + ${bonus} ${copy('бонус', 'bonus')}`}</small></span>
            <div className="buildStepper">
              <button type="button" aria-label={copy('Уменьшить', 'Decrease') + ' · ' + statLabels[stat][lang]}
                disabled={state.points[stat] === 0} onClick={() => step(stat, -1)}>−</button>
              <AttributeInput name={copy('Без бонусов · ', 'Before bonuses · ') + statLabels[stat][lang]} value={startingAttribute + state.points[stat]} onCommit={value => updateAttribute(stat, () => value - startingAttribute)}/>
              <button type="button" aria-label={copy('Увеличить', 'Increase') + ' · ' + statLabels[stat][lang]}
                disabled={left === 0} onClick={() => step(stat, 1)}>+</button>
            </div>
          </div>;
        })}
      </div>

      <details className="mediaDetails buildAdvanced" id="build-advanced">
        <summary><strong>{copy('Бюджет очков и временные усиления', 'Custom points and temporary buffs')}</strong></summary>
        <p className="caption">{copy('По умолчанию доступно по одному очку за уровень. Если в игре у тебя другой запас, укажи сумму вложенных и свободных очков. Усиления осады и книги прибавляются к итоговым статам.', 'The default budget is one point per level. If yours differs, enter the sum of invested and unspent points. Siege and book buffs contribute to your totals.')}</p>
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

    <section className="card buildPanel" aria-labelledby="build-rings-title">
      <h2 id="build-rings-title">{copy('Кольца', 'Rings')}</h2>
      <p className="caption">{state.level < 5 ? copy('Кольца доступны с 5-го уровня совы.', 'Rings unlock at owl level 5.') : copy('Нажми на слот, чтобы выбрать кольцо или изменить заточку.', 'Tap a slot to choose a ring or adjust sharpening.')}</p>
      {state.level >= 5 && state.rings.map((slot, i) => <div className="buildEquip" key={i}>
        <button type="button" className="buildEquipMain" aria-haspopup="dialog" onClick={() => { lightHaptic(); setPicker({ kind: 'ring', slot: i }); }}>
          {slot ? <GameArt path={ringArt(slot.ring.id)} size={34}/> : <span className="buildEmptySlot" aria-hidden="true">+</span>}
          <span><strong>{slot ? ringName(slot.ring, lang) : copy('Выбрать кольцо', 'Choose ring') + ' ' + (i + 1)}</strong>
            {slot && <small>{statLabels[slot.ring.attribute][lang]} +{slot.ring.bonus + slot.enchant}{slot.enchant > 0 && ` · ${copy('Заточка', 'Sharpening')} +${slot.enchant}`}</small>}</span>
          <span className="rowChevron" aria-hidden="true"/>
        </button>
      </div>)}
    </section>

    <section className="card buildPanel" aria-labelledby="build-skills-title">
      <h2 id="build-skills-title">{copy('Навыки в бою', 'Combat skills')}</h2>
      <p className="caption">{state.level < 2 ? copy('Навыки доступны со 2-го уровня совы.', 'Skills unlock at owl level 2.') : copy('До трёх навыков. Для третьей ступени, например, нужно 3 очка в её ветке. Уровни навыков повышаются за SP.', 'Equip up to three skills. Tier three, for example, requires three points in its branch. SP raises a skill’s level.')}</p>
      {state.level >= 2 && state.skills.map((slot, i) => {
        const skill = slot && skillById.get(slot.id);
        return <div className="buildEquip" key={i}>
          <button type="button" className="buildEquipMain" aria-haspopup="dialog" onClick={() => { lightHaptic(); setPicker({ kind: 'skill', slot: i }); }}>
            {skill ? <GameArt path={skillArt(skill.id)} size={34}/> : <span className="buildEmptySlot"><GameGlyph name="lightning"/></span>}
            <span><strong>{skill ? nameOf(skill) : copy('Выбрать навык', 'Choose skill') + ' ' + (i + 1)}</strong>
              {slot && skill && <small>{slot.level} {copy('ур. · ', 'lvl · ')}{skillMana(skill.tier, passive(skill), skill.id === 10)} {passive(skill)
                ? copy('маны за срабатывание', 'mana per trigger')
                : copy('маны · ', 'mana · ') + skillCooldown(skill.tier) + copy(' с перезарядки', ' s cooldown')}</small>}
            </span>
            <span className="rowChevron" aria-hidden="true"/>
          </button>
          {slot && skill && <p className="buildSkillEffect">{skillEffect(skill.id, slot.level, state.level, lang).map(row => row.join(' ')).join(' · ')}</p>}
        </div>;
      })}
    </section>

    <section className="card buildPanel buildPreview" aria-labelledby="build-results-title">
      <h2 id="build-results-title">{copy('Параметры в бою', 'Combat stats')}</h2>
      <BattleReadout stats={results}/>
      <button className="primary buildAnalyze" type="button" aria-expanded={showReview} aria-controls="build-review" onClick={() => {
        lightHaptic();
        setShowReview(open => {
          if (!open) trackGuide('build:analyze');
          return !open;
        });
      }}><GameGlyph name="sparkles"/>{showReview ? copy('Свернуть анализ', 'Hide analysis') : copy('Анализ сборки', 'Analyze build')}</button>
      <div id="build-review" className="buildAnalysisStatus" hidden={!showReview}>
        {showReview && <BuildAnalysis state={state} lang={lang}/>}
        <details className="mediaDetails buildPractice" id="build-practice">
          <summary><span><strong>{copy('Тренировочные бои', 'Practice duels')}</strong><small>{copy('Сравни сборки в одних и тех же сценариях', 'Compare builds in the same scenarios')}</small></span></summary>
          <p className="caption">{copy('Четыре соперника твоего уровня с тем же запасом очков. Их сборки фиксированы, навыки применяются автоматически. В рейтинге исход зависит от соперника и решений в бою.', 'Four opponents share your level and point budget. Their builds stay fixed and skills are cast automatically. Ranked results depend on your opponent and decisions during the fight.')}</p>
          {totalAttributes(state.buffs) > 0 && <p className="caption">{copy('Твои временные усиления учтены. У соперников усилений нет.', 'Your temporary buffs apply. Opponents have no temporary buffs.')}</p>}
          {comparison && <p className="buildComparisonStatus">{comparison.key === practiceKey(state)
            ? copy('Сборка для сравнения сохранена.', 'A build is saved for comparison.')
            : copy('Для сравнения верни исходный уровень и запас очков или сохрани новый результат.', 'Restore the previous level and point budget to compare, or save a new result.')}
            <button className="buildTextButton" type="button" onClick={() => setComparison(null)}>{copy('Убрать', 'Clear')}</button></p>}
          <button className="secondary buildRunPractice" type="button" onClick={startPractice} disabled={practice === 'waiting'}>
            {practice === 'waiting' ? copy('Идут тренировочные бои…', 'Running practice duels…') : copy('Проверить в боях', 'Run practice duels')}
          </button>
          <div aria-live="polite">
            {practice === 'error' && <p className="caption">{copy('Не удалось запустить бои. Попробуй ещё раз.', 'Could not start practice duels. Try again.')}</p>}
            {practice && typeof practice !== 'string' && <BuildPractice result={practice} comparison={comparison} lang={lang} state={state}
              save={() => { lightHaptic(); setComparison(practice); }}/>}
          </div>
        </details>
      </div>
    </section>

    <section className="card buildPanel buildGuide" aria-labelledby="build-guide-title">
      <h2 id="build-guide-title" ref={guideRef} tabIndex={-1}>{copy('Руководство по билдам', 'Build guide')}</h2>
      <p className="caption">{copy('Выбери стиль боя. В каждом билде есть тактика, слабое место и условия для полного набора навыков.', 'Choose a fighting style. Each build explains its tactics, weaknesses and full skill requirements.')}</p>
      {builds.map(build => {
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
          <button className="secondary" type="button" onClick={() => applyPreset(build, true)}>{copy('Применить билд', 'Apply build')}</button>
        </details>;
      })}
    </section>

    {choosePreset && <BuildPicker title={copy('Готовые сборки', 'Preset builds')} closeLabel={copy('Закрыть', 'Close')} onClose={() => setChoosePreset(false)}>
      <p className="caption buildPresetNote">{copy('Сборка заменит очки, кольца и навыки. Заточка и уровни навыков подставляются как цели для прокачки.', 'A preset replaces points, rings and skills. Sharpening and skill levels are suggested upgrade targets.')}</p>
      <div className="buildPickerOptions">
        {builds.map(build => <PickerOption key={build.id} art={skillArt(build.signature)}
          title={build.name[lang]} meta={build.role[lang]} selected={selectedPreset?.id === build.id} disabled={false}
          onSelect={() => { applyPreset(build); setChoosePreset(false); }}/>)}
      </div>
    </BuildPicker>}

    {picker && <BuildPicker key={picker.kind} title={picker.kind === 'ring' ? copy('Выбрать кольцо', 'Choose ring') : copy('Выбрать навык', 'Choose skill')}
      closeLabel={copy('Закрыть', 'Close')} onClose={() => setPicker(null)}>
      <div className="buildPickerOptions">
        {picker.kind === 'ring' && state.rings[picker.slot] && <PickerLevel title={copy('Заточка кольца', 'Ring sharpening')} min={0} max={20}
          value={state.rings[picker.slot]!.enchant} onChange={enchant => {
            const slot = state.rings[picker.slot];
            if (slot) update({ rings: replaceSlot(state.rings, picker.slot, { ...slot, enchant }) });
          }}/>}
        {picker.kind === 'skill' && state.skills[picker.slot] && <PickerLevel title={copy('Уровень навыка', 'Skill level')} min={1} max={21}
          value={state.skills[picker.slot]!.level} onChange={level => {
            const slot = state.skills[picker.slot];
            if (slot) update({ skills: replaceSlot(state.skills, picker.slot, { ...slot, level }) });
          }}/>}
        {(picker.kind === 'ring' ? state.rings[picker.slot] : state.skills[picker.slot]) && <button className="buildTextButton buildClearSlot"
          type="button" onClick={() => {
            lightHaptic();
            update(picker.kind === 'ring' ? { rings: replaceSlot(state.rings, picker.slot, null) } : { skills: replaceSlot(state.skills, picker.slot, null) });
            setPicker(null);
          }}>{copy('Освободить слот', 'Clear slot')}</button>}
        {picker.kind === 'ring' ? ringCatalog.map(ring => {
          const locked = ring.minLevel > state.level;
          return <PickerOption key={ring.id} art={ringArt(ring.id)} title={ringName(ring, lang)}
            meta={'+' + ring.bonus + ' · ' + statLabels[ring.attribute][lang] + ' · ' + copy('с уровня ', 'level ') + ring.minLevel}
            disabled={locked} selected={state.rings[picker.slot]?.ring.id === ring.id} onSelect={() => {
              lightHaptic();
              const equipped = state.rings[picker.slot];
              update({ rings: replaceSlot(state.rings, picker.slot, equipped?.ring.id === ring.id ? equipped : { ring, enchant: 0 }) });
              setPicker(null);
            }}/>;
        }) : <SkillPickerOptions state={state} slot={picker.slot} lang={lang} onSelect={id => {
          lightHaptic();
          const equipped = state.skills[picker.slot];
          update({ skills: replaceSlot(state.skills, picker.slot, equipped?.id === id ? equipped : { id, level: 1 }) });
          setPicker(null);
        }}/>}
      </div>
    </BuildPicker>}
  </div>;
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

function BuildPicker({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useModal(ref, true);
  return <dialog className="modal buildPickerModal" ref={ref} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialogBody">
      <header className="buildHeading"><h2 id={titleId} data-dialog-title tabIndex={-1}>{title}</h2>
        <button className="close" type="button" aria-label={closeLabel} onClick={onClose}>×</button></header>
      {children}
    </div>
  </dialog>;
}

function SkillPickerOptions({ state, slot, lang, onSelect }: { state: BuildState; slot: number; lang: number; onSelect: (id: number) => void }) {
  const [branch, setBranch] = useState<StatKey>(() => {
    const equipped = state.skills[slot];
    return (equipped && skillById.get(equipped.id)?.branch) || statKeys.find(stat => state.points[stat] > 0) || 'strength';
  });
  return <>
    <div className="buildBranchFilter choiceBar" role="group" aria-label={lang ? 'Skill branches' : 'Ветки навыков'}>
      {statKeys.map(stat => <button key={stat} type="button" aria-pressed={branch === stat} onClick={() => setBranch(stat)}>
        <GameAttribute name={stat}/>{statLabels[stat][lang]}
      </button>)}
    </div>
    {orderedSkills.filter(skill => skill.branch === branch).map(skill => {
      const selected = state.skills[slot]?.id === skill.id;
      const used = !selected && state.skills.some(item => item?.id === skill.id);
      const available = skillAvailable(skill.id, state);
      const requirement = state.level < 2 ? (lang ? 'From owl level 2' : 'Со 2-го уровня совы')
        : lang ? `Invest ${skill.tier} points in ${statLabels[branch][lang]}` : `Вложено очков в ветку ${state.points[branch]} из ${skill.tier}`;
      return <PickerOption key={skill.id} art={skillArt(skill.id)} title={lang ? skill.name : skill.title}
        meta={used ? (lang ? 'Already equipped' : 'Уже в наборе') : available ? (lang ? skill.effect.split('.')[0].replace(/\{[^}]+\}/g, '…') : skill.summary) : requirement}
        disabled={used || !available} selected={selected} onSelect={() => onSelect(skill.id)}/>;
    })}
  </>;
}

function PickerOption({ art, title, meta, disabled, selected, onSelect }: {
  art: string; title: string; meta: string; disabled: boolean; selected: boolean; onSelect: () => void;
}) {
  return <button className="buildPickerOption" aria-pressed={selected} disabled={disabled} type="button" onClick={onSelect}>
    <GameArt path={art} size={36}/><span><strong>{title}</strong><small>{meta}</small></span>
    <span className="buildPickerCheck" aria-hidden="true">{selected ? '✓' : ''}</span>
  </button>;
}

function PickerLevel({ title, min, max, value, onChange }: {
  title: string; min: number; max: number; value: number; onChange: (value: number) => void;
}) {
  return <label className="field buildPickerLevel"><span>{title}</span>
    <select value={value} onChange={event => onChange(Number(event.target.value))}>
      {Array.from({ length: max - min + 1 }, (_, i) => <option key={i} value={i + min}>{min === 0 ? '+' : ''}{i + min}</option>)}
    </select>
  </label>;
}

function BuildAnalysis({ state, lang }: { state: BuildState; lang: number }) {
  const copy = (ru: string, en: string) => lang ? en : ru;
  const review = reviewBuild(state);
  const notes: { title: string; detail: string }[] = [];
  if (review.freePoints > 0) notes.push({
    title: copy('Распредели свободные очки', 'Allocate your unspent points'),
    detail: copy(`Свободно: ${review.freePoints}. Выносливость даёт HP, мудрость — ману и шанс крита. Для нового навыка вкладывай очки в его ветку.`,
      `${review.freePoints} left. Endurance adds HP. Wisdom adds mana and crit chance. Invest in the matching branch to unlock a skill.`),
  });
  if (review.skillSlots > 0) notes.push({
    title: copy('Есть место для навыков', 'You can equip more skills'),
    detail: copy(`Доступных пустых слотов: ${review.skillSlots}. Для начала подбери навык под задачу: лечение, контроль или урон.`,
      `Available empty slots: ${review.skillSlots}. Start with a skill that fills a role: healing, control or damage.`),
  });
  if (review.ringSlots > 0) notes.push({
    title: copy('Заполни слоты колец', 'Fill your ring slots'),
    detail: copy(`Пустых слотов: ${review.ringSlots}. Мудрость даёт запас маны, ловкость — уклонение, сила — урон обычных ударов.`,
      `Empty slots: ${review.ringSlots}. Wisdom adds mana, Agility adds dodge and Strength adds basic hit damage.`),
  });
  if (review.flurryWithoutHint) notes.push({
    title: copy('Выбирай момент для Воя берсерка', 'Time Berserk Howl'),
    detail: copy('Вся серия идёт в последнюю атакованную зону. Используй навык после попадания или попробуй Сковывающие цепи либо Подсказку духа.',
      'The whole flurry targets the last attacked zone. Cast it after a hit or try pairing it with Chains or Spirit Guidance.'),
  });
  if (review.overCap.includes('agility')) notes.push({
    title: copy('Уклонение уже на потолке', 'Dodge is capped'),
    detail: review.movableAgility > 0
      ? copy(`С текущими бонусами можно перенести до ${review.movableAgility} вложенных очков ловкости и сохранить уклонение и выбранные навыки.`,
        `With the current bonuses, you can move up to ${review.movableAgility} invested Agility points and keep your dodge and equipped skills.`)
      : copy('Уклонение ограничено 70% при 100 ловкости. Если хочешь освободить очки, проверь вклад колец и временных усилений.',
        'Dodge caps at 70% at 100 Agility. Check rings and temporary buffs if you want to free up points.'),
  });
  if (review.overCap.includes('wisdom')) notes.push({
    title: copy('Крит уже достиг 70%', 'Crit chance has reached 70%'),
    detail: copy('После 100 мудрости крит больше не растёт. Каждое следующее очко всё ещё даёт 20 маны.',
      'Crit chance stops increasing at 100 Wisdom. Each additional point still gives 20 mana.'),
  });
  if (review.rotationCost > 0 && review.mana < review.rotationCost * 2) notes.push({
    title: copy('Оставь ману на ключевой навык', 'Reserve mana for a key skill'),
    detail: copy('Запаса меньше, чем нужно на два применения каждого активного навыка. Определи, какой навык важнее повторить в конце боя.',
      'Your mana covers fewer than two uses of each active skill. Decide which skill you want to cast again late in the fight.'),
  });
  return <div className="buildAnalysis">
    <h3>{copy('Что проверить в сборке', 'What to check in the build')}</h3>
    {notes.length > 0 ? <ul className="buildAdvice">{notes.map(note =>
      <li key={note.title}><strong>{note.title}</strong><p>{note.detail}</p></li>)}</ul>
      : <p className="caption">{copy('По очкам, слотам и запасу маны явных проблем нет. Если выбираешь между двумя вариантами, сравни их в тренировочных боях.',
        'The point allocation, slots and mana check out. If you are choosing between two builds, compare them in practice duels.')}</p>}
    {(review.rotationCost > 0 || review.hasPassives) && <div className="buildManaCheck">
      <div><span>{copy('Запас маны', 'Mana pool')}</span><strong>{review.mana}</strong></div>
      {review.rotationCost > 0 && <div><span>{copy('Все активные навыки по разу', 'One cast of each active skill')}</span><strong>{review.rotationCost}</strong></div>}
      {review.hasPassives && <p>{copy('Пассивные навыки расходуют ману при срабатывании.', 'Passive skills consume mana when triggered.')}</p>}
    </div>}
  </div>;
}

function BuildPractice({ result, comparison, lang, save, state }: { result: PracticeResult; comparison: PracticeResult | null; lang: number; save: () => void; state: BuildState }) {
  const copy = (ru: string, en: string) => lang ? en : ru;
  const prior = comparison?.key === result.key && comparison !== result ? comparison : null;
  const percent = (wins: number, trials: number) => Math.round(wins * 100 / trials) + '%';
  const weakest = result.matchups.reduce((weak, row) => row.wins < weak.wins ? row : weak);
  const hasSkill = (id: number) => state.skills.some(slot => slot?.id === id);
  const experiments: Record<string, string> = {
    stun: hasSkill(20) ? copy('Молния проходит через блок и уклонение. В реальном бою прибереги Фазовый сдвиг на её применение.', 'Lightning goes through guard and dodge. In a real fight, save Phase Shift for that cast.')
      : copy('Сравни вариант с большим запасом HP или Фазовым сдвигом. Молния проходит через блок и уклонение.', 'Try more HP or Phase Shift. Lightning goes through guard and dodge.'),
    bastion: state.rings.every(slot => slot?.ring.attribute === 'wisdom')
      ? copy('Все кольца уже дают ману. Сравни вариант с более дешёвым активным навыком для затяжного боя.', 'All your rings already add mana. Try a cheaper active skill for drawn-out duels.')
      : copy('Попробуй увеличить запас маны для затяжного боя. Сравни сборку, заменив одно кольцо на кольцо мудрости.', 'Try more mana for drawn-out duels. Swap one ring for a Wisdom ring and compare.'),
    dodge: [1, 6, 11, 12, 16].some(hasSkill)
      ? copy('У тебя уже есть прямой урон сквозь уклонение. Проверь, что изменится, если заменить затратный навык или добавить ману для повторного применения.', 'You already have direct damage that bypasses dodge. Try swapping an expensive skill or giving yourself more mana for repeat casts.')
      : copy('Попробуй навык сквозь уклонение, например Молнию или Астероид.', 'Try an ability that bypasses dodge, such as Lightning or Asteroid.'),
    assault: hasSkill(9) || hasSkill(6)
      ? copy('У тебя уже есть ответ на частые удары. В реальном бою прибереги его до серии, когда соперник готов атаковать.', 'You already have an answer to frequent hits. In a real fight, save it for when the opponent is ready to attack.')
      : copy('Попробуй Статический щит для ответного урона или Снежок, чтобы замедлить атаки соперника.', 'Try Static Shield for retaliation, or Snowball to slow the opponent’s attacks.'),
  };
  const canCompareFullBuilds = state.level >= 5 && (state.budget ?? state.level) >= 8;
  return <div className="buildPracticeResult">
    <p className="caption">{result.matchups[0].trials} {copy('боёв с каждым соперником', 'duels per opponent')}
      {result.skillLevel !== undefined && copy(` · навыки соперников ${result.skillLevel} ур.`, ` · opponent skills lvl ${result.skillLevel}`)}
      {result.enchant !== undefined && copy(` · заточка +${result.enchant}`, ` · sharpening +${result.enchant}`)}
    </p>
    <dl className="buildMatchups">
      {result.matchups.map(row => {
        const previous = prior?.matchups.find(item => item.id === row.id);
        const defeats = row.trials - row.wins - row.draws;
        return <div key={row.id}>
          <dt><strong>{builds.find(build => build.id === row.id)?.name[lang]}</strong>
            <small>{copy(`Побед ${row.wins} · поражений ${defeats}`, `Wins ${row.wins} · losses ${defeats}`)}
              {row.draws > 0 && copy(` · ничьих ${row.draws}`, ` · draws ${row.draws}`)}</small>
          </dt>
          <dd>{percent(row.wins, row.trials)}{previous && <small>{copy('было', 'was')} {percent(previous.wins, previous.trials)}</small>}</dd>
        </div>;
      })}
    </dl>
    {canCompareFullBuilds && weakest.wins * 5 < weakest.trials * 2 && <p className="buildPracticeHint">
      <strong>{copy('Что проверить в следующей серии', 'What to try in the next series')}</strong>
      {experiments[weakest.id]}
    </p>}
    <button className="secondary buildRunPractice" type="button" onClick={save} disabled={comparison === result}>{comparison === result
      ? copy('Сохранено для сравнения', 'Saved for comparison')
      : copy('Сохранить для сравнения', 'Save for comparison')}</button>
    {comparison === result && <p className="caption">{copy('Измени сборку и запусти бои ещё раз. Рядом появится прошлый результат.', 'Edit your build and run the duels again to see the previous result next to the new one.')}</p>}
  </div>;
}
