import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { battleStats, skillCooldown, skillMana, startingAttribute } from '../domain/combat';
import { GameArt } from '../ui/GameArt';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { useModal } from '../ui/useModal';
import { lightHaptic } from '../telegram/client';
import { useGuideLocale } from './guideLocale';
import progression from './owl-progression.json';
import { BattleReadout, skillEffect } from './BattleReadout';
import {
  builds, combatSkills, emptyAttributes, presetAttributes, requiredAttributes, ringCatalog,
  skillById, statKeys, statLabels, totalAttributes, type Attributes, type StatKey,
} from './combat-builds';

type Ring = typeof ringCatalog[number];
type EquippedRing = { ring: Ring; enchant: number };
type EquippedSkill = { id: number; level: number };
type BuildState = {
  level: number;
  budget: number | null;
  points: Attributes;
  buffs: Attributes;
  rings: (EquippedRing | null)[];
  skills: (EquippedSkill | null)[];
};
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
  const [analysis, setAnalysis] = useState<'idle' | 'waiting' | 'ready'>('idle');
  const analysisTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try { localStorage.setItem(buildStorage, JSON.stringify(state)); } catch { /* Storage is optional. */ }
  }, [state]);
  useEffect(() => () => { if (analysisTimer.current !== null) clearTimeout(analysisTimer.current); }, []);
  const resetAnalysis = () => {
    if (analysisTimer.current !== null) clearTimeout(analysisTimer.current);
    analysisTimer.current = null;
    setAnalysis('idle');
  };
  const startAnalysis = () => {
    lightHaptic();
    setAnalysis('waiting');
    analysisTimer.current = setTimeout(() => {
      analysisTimer.current = null;
      setAnalysis('ready');
    }, 360);
  };
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const levelRef = useRef<HTMLSelectElement>(null);
  const guideRef = useRef<HTMLHeadingElement>(null);
  const spent = totalAttributes(state.points);
  const budget = state.budget ?? state.level;
  const left = budget - spent;
  const total = { ...state.points };
  for (const stat of statKeys) total[stat] += startingAttribute + state.buffs[stat];
  for (const slot of state.rings) if (slot) total[slot.ring.attribute] += slot.ring.bonus + slot.enchant;
  const results = battleStats(state.level, total.strength, total.agility, total.wisdom, total.endurance);
  const nameOf = (skill: typeof combatSkills[number]) => lang ? skill.name : skill.title;
  const update = (change: Partial<BuildState>) => {
    resetAnalysis();
    setActivePreset(null);
    setState(s => validateBuild({ ...s, ...change }));
  };
  const updateAttribute = (stat: StatKey, getAmount: (current: number) => number) => {
    resetAnalysis();
    setActivePreset(null);
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
    const next: BuildState = { ...state, points: presetAttributes(build, state.level, budget) };
    next.rings = build.rings.map(attribute => {
      const ring = ringCatalog.filter(ring => ring.attribute === attribute && ring.minLevel <= state.level)
        .sort((a, b) => b.tier - a.tier)[0];
      return ring ? { ring, enchant: 0 } : null;
    });
    const readySkills = build.skills.filter(id => skillAvailable(id, next));
    next.skills = emptySlots.map((_, i) => readySkills[i] ? { id: readySkills[i], level: 1 } : null);
    setState(next);
    setActivePreset(build.id);
    if (returnToLevel) levelRef.current?.focus();
  }

  return <div className="buildConstructor">
    <section className="card buildPanel" aria-labelledby="build-level-title">
      <div className="buildHeading">
        <h2 id="build-level-title">{copy('Калькулятор билда', 'Build calculator')}</h2>
        <button type="button" className="buildTextButton" onClick={() => {
          lightHaptic();
          resetAnalysis();
          setActivePreset(null);
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
        {builds.slice(0, 5).map((build, index) => <button className="buildPresetChoice" key={build.id} type="button"
          aria-pressed={activePreset === build.id} onClick={() => applyPreset(build)}>
          {index === 0 ? <GameGlyph name="shield"/> : <GameAttribute name={statKeys[index - 1]}/>}
          <span>{build.name[lang]}</span>
        </button>)}
        <button className="buildPresetChoice" type="button" onClick={() => {
          lightHaptic();
          guideRef.current?.focus({ preventScroll: true });
          guideRef.current?.scrollIntoView({ block: 'start' });
        }}><GameGlyph name="info"/><span>{copy('Все билды', 'All builds')}</span></button>
      </fieldset>

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
        <GameGlyph name="sparkles"/>{analysis === 'waiting' ? copy('Анализируем…', 'Analyzing…') : copy('Анализ', 'Analyze')}
      </button>
      <div className="buildAnalysisStatus" aria-live="polite">
        {analysis === 'ready' && <BuildAnalysis state={state} total={total} lang={lang}/>}
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

function BuildAnalysis({ state, total, lang }: { state: BuildState; total: Attributes; lang: number }) {
  const copy = (ru: string, en: string) => lang ? en : ru;
  const remaining = (state.budget ?? state.level) - totalAttributes(state.points);
  const chosen = state.skills.flatMap(slot => {
    const skill = slot && skillById.get(slot.id);
    return skill ? [skill] : [];
  });
  const castMana = chosen.filter(skill => !passive(skill)).reduce((sum, skill) => sum + skillMana(skill.tier, false), 0);
  const mana = battleStats(state.level, total.strength, total.agility, total.wisdom, total.endurance).mana;
  const ready = orderedSkills.find(skill => skillAvailable(skill.id, state) && !chosen.some(item => item.id === skill.id));
  const advice: string[] = [];
  const capped = (['agility', 'wisdom'] as const).filter(stat => total[stat] > 100);
  if (capped.length) advice.push(copy(
    `Лимит шанса крита и уклонения — 70%. Свыше 100 очков ${capped.map(stat => statLabels[stat][0].toLowerCase()).join(' и ')} соответствующий шанс не растёт. Мудрость по-прежнему даёт ману.`,
    'Crit and dodge cap at 70%. Their chances stop growing above 100 in the relevant attribute. Wisdom still adds mana.',
  ));
  if (remaining > 0) advice.push(copy(
    `Доступно ещё ${remaining} очк. Вкладывай их в ветку нужного навыка. Выносливость добавит по 2 HP за очко, мудрость — по 20 маны.`,
    `You have ${remaining} unspent points. Invest in the branch of a skill you want. Endurance adds 2 HP per point and Wisdom adds 20 mana.`,
  ));
  if (chosen.length < 3 && state.level < 2) advice.push(copy('Навыки откроются со 2-го уровня совы.', 'Skills unlock at owl level 2.'));
  else if (chosen.length < 3 && ready) advice.push(copy(
    `Есть свободный слот навыка. Можно поставить «${ready.title}».`,
    `You have a free skill slot. Try ${ready.name}.`,
  ));
  else if (chosen.length < 3 && remaining > 0) advice.push(copy('Вложи очки в ветку, чтобы открыть навык для свободного слота.', 'Invest in a branch to unlock a skill for your free slot.'));
  if (castMana > 0) advice.push(castMana > mana
    ? copy(`По одному применению всех активных навыков потребует ${castMana} маны при запасе ${mana}. Добавь мудрость или возьми навык дешевле.`, `One cast of every active skill costs ${castMana} mana out of ${mana}. Add Wisdom or choose a cheaper skill.`)
    : copy(`На один цикл активных навыков уйдёт ${castMana} из ${mana} маны. Оставь запас на повторные применения и пассивные эффекты.`, `One cast of each active skill costs ${castMana} of ${mana} mana. Keep a reserve for repeat casts and passive effects.`));
  const emptyRings = state.rings.filter(slot => slot === null).length;
  if (emptyRings > 0) advice.push(state.level < 5
    ? copy('Первые кольца доступны с 5-го уровня.', 'Your first rings unlock at level 5.')
    : copy(`Свободно слотов колец: ${emptyRings}. Кольца силы усиливают удары, ловкости — уклонение, мудрости — крит и ману.`, `Free ring slots: ${emptyRings}. Strength supports damage, Agility supports dodge, and Wisdom supports crit and mana.`));
  if (state.rings.some(slot => slot && ringCatalog.some(ring =>
    ring.attribute === slot.ring.attribute && ring.minLevel <= state.level && ring.bonus > slot.ring.bonus + slot.enchant))) {
    advice.push(copy('Для одного из слотов уже доступно кольцо с большей прибавкой без заточки.', 'A ring with a higher unsharpened bonus is already available for one slot.'));
  }
  if (!advice.length) advice.push(copy(
    'Очки распределены, слоты заполнены. Для долгих боёв проверь запас маны и здоровья. Для серии ударов оцени силу и шанс крита.',
    'Your points and slots are filled. For long fights check mana and health. For hit combos review Strength and crit chance.',
  ));
  return <section className="buildAnalysis" aria-label={copy('Анализ билда', 'Build analysis')}>
    <h3>{copy('Что улучшить', 'What to improve')}</h3>
    <ul>{advice.map(line => <li key={line}>{line}</li>)}</ul>
  </section>;
}
