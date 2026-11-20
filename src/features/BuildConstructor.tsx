import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { battleStats, skillCooldown, skillMana, startingAttribute } from '../domain/combat';
import { GameArt } from '../ui/GameArt';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { useModal } from '../ui/useModal';
import { lightHaptic } from '../telegram/client';
import { useGuideLocale } from './guideLocale';
import progression from './owl-progression.json';
import { BattleReadout, skillEffect } from './BattleReadout';
import {
  activeAttributes, applyBuildPreset, builds, combatSkills, emptyAttributes, requiredAttributes, ringCatalog,
  skillById, statKeys, statLabels, totalAttributes, type StatKey, type BuildState,
} from './combat-builds';

import type { AnalysisResult } from './combat-analysis';

type Picker = { kind: 'ring' | 'skill'; slot: number };
const maxLevel = progression.current.length - 1;
const emptySlots = [null, null, null];
const orderedSkills = [...combatSkills].sort((a, b) => a.tier - b.tier);
const skillArt = (id: number) => '/game/skills/' + id + '.png';
const ringArt = (id: string) => '/game/items/' + id + '.webp';
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

function skillAvailable(id: number, { level, points }: BuildState) {
  const skill = skillById.get(id);
  return !!skill && level >= 2 && points[skill.branch] >= skill.tier;
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
  const [analysis, setAnalysis] = useState<AnalysisResult | 'waiting' | 'error' | null>(null);
  const worker = useRef<Worker | null>(null);
  useEffect(() => {
    try { localStorage.setItem(buildStorage, JSON.stringify(state)); } catch { /* Storage is optional. */ }
  }, [state]);
  useEffect(() => () => worker.current?.terminate(), []);
  const resetAnalysis = () => {
    worker.current?.terminate();
    worker.current = null;
    setAnalysis(null);
  };
  const startAnalysis = () => {
    lightHaptic();
    resetAnalysis();
    setAnalysis('waiting');
    try {
      const task = new Worker(new URL('./combat-analysis.worker.ts', import.meta.url), { type: 'module' });
      worker.current = task;
      const finish = (result: AnalysisResult | 'error') => {
        if (worker.current !== task) return;
        task.terminate();
        worker.current = null;
        setAnalysis(result);
      };
      task.onmessage = (event: MessageEvent<AnalysisResult>) => finish(event.data);
      task.onerror = () => finish('error');
      task.postMessage(state);
    } catch { setAnalysis('error'); }
  };
  const activePreset = useMemo(() => builds.find(build => {
    const preset = applyBuildPreset(build, state);
    return statKeys.every(stat => state.points[stat] === preset.points[stat]) &&
      state.rings.every((slot, i) => slot?.ring.id === preset.rings[i]?.ring.id && slot?.enchant === preset.rings[i]?.enchant) &&
      state.skills.every((slot, i) => slot?.id === preset.skills[i]?.id && slot?.level === preset.skills[i]?.level);
  })?.id, [state]);
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const levelRef = useRef<HTMLSelectElement>(null);
  const guideRef = useRef<HTMLHeadingElement>(null);
  const spent = totalAttributes(state.points);
  const budget = state.budget ?? state.level;
  const left = budget - spent;
  const total = activeAttributes(state);
  const results = battleStats(state.level, total.strength, total.agility, total.wisdom, total.endurance);
  const nameOf = (skill: typeof combatSkills[number]) => lang ? skill.name : skill.title;
  const update = (change: Partial<BuildState>) => {
    resetAnalysis();
    setState(s => validateBuild({ ...s, ...change }));
  };
  const updateAttribute = (stat: StatKey, getAmount: (current: number) => number) => {
    resetAnalysis();
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
    resetAnalysis();
    setState(applyBuildPreset(build, state));
    if (returnToLevel) levelRef.current?.focus();
  }

  return <div className="buildConstructor">
    <section className="card buildPanel" aria-labelledby="build-level-title">
      <div className="buildHeading">
        <h2 id="build-level-title">{copy('Калькулятор билда', 'Build calculator')}</h2>
        <button type="button" className="buildTextButton" onClick={() => {
          lightHaptic();
          resetAnalysis();
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
        <div className="buildBudget"><small>{copy('Свободно очков', 'Unspent points')}</small><strong>{left} <small>/ {budget}</small></strong></div>
      </div>

      <fieldset className="buildQuickPresets">
        <legend>{copy('Готовые сборки', 'Presets')}</legend>
        {builds.map((build) => <button className="buildPresetChoice" key={build.id} type="button"
          aria-pressed={activePreset === build.id} onClick={() => applyPreset(build)}>
          <GameAttribute name={build.icon}/>
          <span>{build.name[lang]}</span>
        </button>)}
        <button className="buildPresetChoice" type="button" onClick={() => {
          lightHaptic();
          guideRef.current?.focus({ preventScroll: true });
          guideRef.current?.scrollIntoView({ block: 'start' });
        }}><GameGlyph name="info"/><span>{copy('Тактика', 'Tactics')}</span></button>
      </fieldset>
      <p className="caption buildPlanNote">{copy('Сборки подбирают навыки и кольца под уровень совы. Уровни навыков и заточка — цели для прокачки.', 'Presets choose skills and rings for your owl level. Skill levels and sharpening are targets.')}</p>

      <div className="buildPreview">
        <h3>{copy('Параметры в бою', 'Combat stats')}</h3>
        <BattleReadout stats={results}/>
      </div>

      <div className="buildAllocationHeading"><h3>{copy('Распределение очков', 'Allocate points')}</h3>
        <p className="caption">{copy('Введи статы совы без колец и усилений. Каждый атрибут начинается с 3. Слева — итог в бою.', 'Enter attributes before gear and buffs. Each starts at 3. The left shows the combat total.')}</p>
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

      <button className="primary buildAnalyze" type="button" onClick={startAnalysis} disabled={analysis === 'waiting'}>
        <GameGlyph name="sparkles"/>{analysis === 'waiting' ? copy('Симулируем бои…', 'Simulating duels…') : copy('Анализ', 'Analyze')}
      </button>
      <div className="buildAnalysisStatus" aria-live="polite">
        {analysis === 'error' && <p className="caption">{copy('Не удалось запустить симуляцию. Попробуй ещё раз.', 'Could not start the simulation. Try again.')}</p>}
        {analysis && typeof analysis !== 'string' && <BuildAnalysis result={analysis} lang={lang}/>}
      </div>

      <details className="mediaDetails buildAdvanced">
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
      <p className="caption">{copy('Нажми на слот, чтобы выбрать кольцо или изменить заточку.', 'Tap a slot to choose a ring or adjust sharpening.')}</p>
      {state.rings.map((slot, i) => <div className="buildEquip" key={i}>
        <button type="button" className="buildEquipMain" onClick={() => { lightHaptic(); setPicker({ kind: 'ring', slot: i }); }}>
          {slot ? <GameArt path={ringArt(slot.ring.id)} size={34}/> : <span className="buildEmptySlot" aria-hidden="true">+</span>}
          <span><strong>{slot ? slot.ring.title : copy('Выбрать кольцо', 'Choose ring') + ' ' + (i + 1)}</strong>
            {slot && <small>{statLabels[slot.ring.attribute][lang]} +{slot.ring.bonus + slot.enchant}{slot.enchant > 0 && ` · ${copy('Заточка', 'Sharpening')} +${slot.enchant}`}</small>}</span>
          <span className="rowChevron" aria-hidden="true"/>
        </button>
      </div>)}
    </section>

    <section className="card buildPanel" aria-labelledby="build-skills-title">
      <h2 id="build-skills-title">{copy('Навыки в бою', 'Combat skills')}</h2>
      <p className="caption">{copy('До трёх навыков. Каждая ступень требует вложенного очка своей ветки.', 'Up to three skills. Each tier requires an invested point in its branch.')}</p>
      {state.skills.map((slot, i) => {
        const skill = slot && skillById.get(slot.id);
        return <div className="buildEquip" key={i}>
          <button type="button" className="buildEquipMain" onClick={() => { lightHaptic(); setPicker({ kind: 'skill', slot: i }); }}>
            {skill ? <GameArt path={skillArt(skill.id)} size={34}/> : <GameGlyph name="lightning"/>}
            <span><strong>{skill ? nameOf(skill) : copy('Выбрать навык', 'Choose skill') + ' ' + (i + 1)}</strong>
              {slot && skill && <small>{slot.level} {copy('ур. · ', 'lvl · ')}{skillMana(skill.tier, passive(skill), skill.id === 10)} {passive(skill)
                ? copy('маны за срабатывание', 'mana per trigger')
                : copy('маны · ', 'mana · ') + skillCooldown(skill.tier) + copy(' с перезарядки', ' s cooldown')}</small>}
            </span>
            <span className="rowChevron" aria-hidden="true"/>
          </button>
          {slot && skill && <>
            <p className="buildSkillEffect">{skillEffect(skill.id, slot.level, state.level, lang).map(row => row.join(' ')).join(' · ')}</p>
          </>}
        </div>;
      })}
    </section>

    <section className="card buildPanel buildGuide" aria-labelledby="build-guide-title">
      <h2 id="build-guide-title" ref={guideRef} tabIndex={-1}>{copy('Руководство по билдам', 'Build guide')}</h2>
      <p className="caption">{copy('Выбери стиль боя и примени сборку к своему уровню. Калькулятор подберёт доступные кольца и навыки. Если очков не хватает, часть навыков останется закрыта.', 'Choose a play style and apply it at your level. The calculator selects available rings and skills. Skills you cannot afford stay locked.')}</p>
      {builds.map(build => {
        const requirements = requiredAttributes(build.skills);
        return <details className="mediaDetails buildGuideEntry" key={build.id}>
          <summary><GameArt path={skillArt(build.skills[2])} size={33}/><span><strong>{build.name[lang]}</strong><small>{build.role[lang]}</small></span></summary>
          <p>{build.play[lang]}</p>
          <div className="buildGuideSkills">{build.skills.map(id => {
            const skill = skillById.get(id)!;
            return <span key={id}><GameArt path={skillArt(id)} size={22}/>{nameOf(skill)}</span>;
          })}</div>
          <p className="caption">{copy('Очки для всех трёх навыков', 'Points for all three skills')} · {statKeys.filter(stat => requirements[stat] > 0).map(stat => statLabels[stat][lang] + ' ' + requirements[stat]).join(' + ')}</p>
          <button className="secondary" type="button" onClick={() => applyPreset(build, true)}>{copy('Применить билд', 'Apply build')}</button>
        </details>;
      })}
      <p className="caption">{copy('Сборки — примеры применения навыков. В рейтинговом бою результат зависит от соперника, блока и действий игроков.', 'These builds illustrate skill combinations. Ranked results depend on the opponent, guard and decisions during the fight.')}</p>
    </section>

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
          return <PickerOption key={ring.id} art={ringArt(ring.id)} title={ring.title}
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
  return <input aria-label={name} inputMode="numeric" maxLength={3} value={draft ?? value}
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

function BuildAnalysis({ result, lang }: { result: AnalysisResult; lang: number }) {
  const copy = (ru: string, en: string) => lang ? en : ru;
  const { baseline, matchups, recommendations } = result;
  const percent = (wins: number, total: number) => Math.round(wins * 100 / total);
  const skillName = (id: number) => lang ? skillById.get(id)?.name : skillById.get(id)?.title;
  return <section className="buildAnalysis" aria-label={copy('Анализ билда', 'Build analysis')}>
    <div className="buildScore">
      <strong>{percent(baseline.wins, baseline.trials)}%</strong>
      <span>{copy('побед в симуляции', 'simulated wins')}<small>{baseline.wins} / {baseline.trials} {copy('боёв', 'duels')} · {Math.round(baseline.seconds / baseline.trials)} {copy('с в среднем', 's average')}</small></span>
    </div>
    <p className="caption">{copy('Пять сборок твоего уровня с тем же бюджетом очков и сопоставимой прокачкой. Результаты рейтинга будут зависеть от действий игроков.', 'Five opponent builds at your level and point budget. This estimate uses simulated tactics. Ranked results depend on players.')}</p>
    <dl className="buildMatchups">
      {matchups.map(row => <div key={row.id}>
        <dt>{builds.find(build => build.id === row.id)?.name[lang]}</dt>
        <dd>{percent(row.wins, row.trials)}%</dd>
      </div>)}
    </dl>
    {baseline.attempts > 0 && <p className="caption buildHitBreakdown">{copy(
      `Противники заблокировали ${percent(baseline.blocked, baseline.attempts)}% твоих ударов и уклонились от ${percent(baseline.evaded, baseline.attempts)}%.`,
      `Opponents blocked ${percent(baseline.blocked, baseline.attempts)}% of your strikes and dodged ${percent(baseline.evaded, baseline.attempts)}%.`,
    )}</p>}
    <h3>{copy('Что можно докрутить', 'What to improve')}</h3>
    {recommendations.length > 0 ? <ul>{recommendations.map(({ change, gain }, index) => {
      let label: string;
      if (change.kind === 'points') {
        const target = statLabels[change.to][lang];
        label = change.from
          ? copy(`Перенеси ${change.amount} очк. из «${statLabels[change.from][lang]}» в «${target}».`, `Move ${change.amount} points from ${statLabels[change.from][lang]} to ${target}.`)
          : copy(`Добавь ${change.amount} очк. в «${target}».`, `Add ${change.amount} points to ${target}.`);
      } else if (change.kind === 'ring') {
        const ring = ringCatalog.find(item => item.id === change.id);
        const name = lang ? [null, 'Wooden', 'Obsidian', 'Golden'][ring?.tier ?? 0] + ' ring: ' + statLabels[ring!.attribute][lang] : ring?.title;
        label = copy(`Слот кольца ${change.slot + 1}: ${name}`, `Ring slot ${change.slot + 1}: ${name}`) + (change.enchant ? ` +${change.enchant}.` : '.');
      } else {
        const name = skillName(change.id);
        label = change.previous && change.previous !== change.id
          ? copy(`Замени «${skillName(change.previous)}» на «${name}» (${change.level} ур.).`, `Replace ${skillName(change.previous)} with ${name} (level ${change.level}).`)
          : copy(`${change.previous ? 'Улучши' : 'Поставь'} «${name}» (${change.level} ур.).`, `${change.previous ? 'Upgrade' : 'Equip'} ${name} (level ${change.level}).`);
      }
      return <li key={index}>{label} <strong>+{Math.round(gain)} {copy('пунктов к доле побед', 'points to win rate')}</strong></li>;
    })}</ul> : <p className="caption">{copy('Проверенные одиночные правки дали прирост меньше 4 пунктов. Смотри разбивку по соперникам перед выбором тактики.', 'Tested single changes gained less than 4 points. Check individual matchups when choosing tactics.')}</p>}
    {baseline.manaShort * 4 >= baseline.trials && <p className="caption">{copy(
      `В ${percent(baseline.manaShort, baseline.trials)}% боёв маны не хватило на готовый навык. Сохраняй её для ключевого применения или попробуй кольцо мудрости.`,
      `You ran out of mana for a ready skill in ${percent(baseline.manaShort, baseline.trials)}% of duels. Save it for key casts or try a Wisdom ring.`,
    )}</p>}
    {result.overCap.length > 0 && <p className="caption">{copy('После 100 очков ловкости или мудрости шанс уклонения или крита уже на пределе 70%. Мудрость продолжает добавлять ману.', 'Dodge and crit cap at 70% at 100 Agility or Wisdom. Wisdom still adds mana beyond that.')}</p>}
  </section>;
}
