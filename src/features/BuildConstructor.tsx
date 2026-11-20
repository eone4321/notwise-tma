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
  const [practice, setPractice] = useState<PracticeResult | 'waiting' | 'error' | null>(null);
  const [comparison, setComparison] = useState<PracticeResult | null>(null);
  const [showAllBuilds, setShowAllBuilds] = useState(false);
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
  const spent = totalAttributes(state.points);
  const budget = state.budget ?? state.level;
  const left = budget - spent;
  const selectedPreset = builds.find(build => build.id === activePreset);
  const total = activeAttributes(state);
  const results = battleStats(state.level, total.strength, total.agility, total.wisdom, total.endurance);
  const nameOf = (skill: typeof combatSkills[number]) => lang ? skill.name : skill.title;

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
    setState(applyBuildPreset(build, state));
  }

  return <div className="buildConstructor">
    <section className="card buildPanel" aria-labelledby="build-level-title">
      <div className="buildHeading">
        <h2 id="build-level-title">{copy('1. Уровень и очки', '1. Level and points')}</h2>
        <button type="button" className="buildPillButton" onClick={() => {
          lightHaptic();
          resetPractice();
          setComparison(null);
          setBudgetDraft(null);
          setState(initialBuild());
        }}>{copy('↺ Сбросить', '↺ Reset')}</button>
      </div>

      <div className="buildSetup">
        <label className="field">{copy('Уровень совы', 'Owl level')}
          <select value={state.level} onChange={event => update({ level: Number(event.target.value) })}>
            {Array.from({ length: maxLevel }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <div className="buildBudget" data-empty={left === 0 || undefined}>
          <small>{copy('Свободные очки', 'Unspent points')}</small>
          <strong>{left} <small>/ {budget}</small></strong>
        </div>
      </div>

      <button className="buildEquipMain buildPresetTrigger" type="button" aria-haspopup="dialog" onClick={() => { lightHaptic(); setChoosePreset(true); }}>
        {selectedPreset ? <GameAttribute name={selectedPreset.icon}/> : <GameGlyph name="sparkles"/>}
        <span>
          <strong>{selectedPreset ? selectedPreset.name[lang] : copy('Выбрать готовую сборку', 'Choose a preset build')}</strong>
          <small>{selectedPreset ? selectedPreset.role[lang] : copy('10 проверенных архетипов с раскладкой под твой уровень', '10 tested archetypes scaled to your level')}</small>
        </span>
        <span className="buildPresetAction">{selectedPreset ? copy('Сменить', 'Change') : copy('Выбрать', 'Pick')}</span>
      </button>

      <div className="buildAllocationHeading">
        <h3>{copy('Распределение очков', 'Attribute points')}</h3>
        <p className="caption">{copy('В полях справа — значения совы без колец и баффов (старт — 3). Навыки открываются за очки сверх базы 3.', 'Values on the right match your owl before rings and buffs (base 3). Skills unlock from points above base 3.')}</p>
      </div>
      <div className="buildAttributes">
        {statKeys.map(stat => {
          const invested = state.points[stat];
          const bonus = total[stat] - invested - startingAttribute;
          return <div className="buildAttributeRow" key={stat}>
            <GameAttribute name={stat}/>
            <span>
              <strong>{statLabels[stat][lang]} <output aria-label={copy('Итого', 'Total') + ' · ' + statLabels[stat][lang]}>{total[stat]}</output></strong>
              <small>{startingAttribute} {copy('база', 'base')} + {invested} {copy('влож.', 'pts')}{bonus > 0 && ` + ${bonus} ${copy('бонус', 'bonus')}`}</small>
            </span>
            <div className="buildStepper">
              <button type="button" aria-label={copy('Уменьшить', 'Decrease') + ' · ' + statLabels[stat][lang]}
                disabled={invested === 0} onClick={() => step(stat, -1)}>−</button>
              <AttributeInput name={copy('Без бонусов · ', 'Before bonuses · ') + statLabels[stat][lang]}
                value={startingAttribute + invested} onCommit={value => updateAttribute(stat, () => value - startingAttribute)}/>
              <button type="button" aria-label={copy('Увеличить', 'Increase') + ' · ' + statLabels[stat][lang]}
                disabled={left === 0} onClick={() => step(stat, 1)}>+</button>
            </div>
          </div>;
        })}
      </div>

      <details className="mediaDetails buildAdvanced" id="build-advanced">
        <summary><strong>{copy('Другой запас очков и баффы (осада, книга)', 'Custom point budget and temporary buffs')}</strong></summary>
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

    <section className="card buildPanel" aria-labelledby="build-rings-title">
      <div className="buildHeading">
        <h2 id="build-rings-title">{copy('2. Кольца', '2. Rings')}</h2>
        {state.level >= 5 && <span className="buildSlotCounter">{state.rings.filter(Boolean).length}/3</span>}
      </div>
      <p className="caption">{state.level < 5 ? copy('Кольца открываются с 5-го уровня совы.', 'Rings unlock at owl level 5.') : copy('Тапни по слоту для выбора кольца, справа сразу настраивается заточка.', 'Tap a slot to pick a ring; adjust sharpening directly on the right.')}</p>
      {state.level >= 5 && state.rings.map((slot, i) => <div className="buildEquip buildEquipInline" key={i}>
        <button type="button" className="buildEquipMain" aria-haspopup="dialog" onClick={() => { lightHaptic(); setPicker({ kind: 'ring', slot: i }); }}>
          {slot ? <GameArt path={ringArt(slot.ring.id)} size={34}/> : <span className="buildEmptySlot" aria-hidden="true">+</span>}
          <span><strong>{slot ? ringName(slot.ring, lang) : copy('Выбрать кольцо', 'Choose ring') + ' ' + (i + 1)}</strong>
            {slot && <small>+{slot.ring.bonus + slot.enchant} {copy('к ', 'to ')}{statLabels[slot.ring.attribute][lang].toLowerCase()}</small>}</span>
          {!slot && <span className="rowChevron" aria-hidden="true"/>}
        </button>
        {slot && <select className="buildInlineSelect" aria-label={copy('Заточка кольца', 'Ring sharpening') + ' ' + (i + 1)}
          value={slot.enchant} onChange={event => update({ rings: replaceSlot(state.rings, i, { ...slot, enchant: Number(event.target.value) }) })}>
          {Array.from({ length: 21 }, (_, lvl) => <option key={lvl} value={lvl}>+{lvl}</option>)}
        </select>}
      </div>)}
    </section>

    <section className="card buildPanel" aria-labelledby="build-skills-title">
      <div className="buildHeading">
        <h2 id="build-skills-title">{copy('3. Навыки в бою', '3. Combat skills')}</h2>
        {state.level >= 2 && <span className="buildSlotCounter">{state.skills.filter(Boolean).length}/3</span>}
      </div>
      <p className="caption">{state.level < 2 ? copy('Навыки открываются со 2-го уровня совы.', 'Skills unlock at owl level 2.') : copy('Ступень навыка требует столько же вложенных очков в его ветке. Справа сразу меняется уровень навыка.', 'Skill tier requires matching branch points. Adjust skill level on the right.')}</p>
      {state.level >= 2 && state.skills.map((slot, i) => {
        const skill = slot && skillById.get(slot.id);
        return <div className="buildEquip buildEquipInline" key={i}>
          <button type="button" className="buildEquipMain" aria-haspopup="dialog" onClick={() => { lightHaptic(); setPicker({ kind: 'skill', slot: i }); }}>
            {skill ? <GameArt path={skillArt(skill.id)} size={34}/> : <span className="buildEmptySlot"><GameGlyph name="lightning"/></span>}
            <span><strong>{skill ? nameOf(skill) : copy('Выбрать навык', 'Choose skill') + ' ' + (i + 1)}</strong>
              {slot && skill && <small>{skillMana(skill.tier, passive(skill), skill.id === 10)} {passive(skill)
                ? copy('маны за срабатывание', 'mana / trigger')
                : copy('маны · откат ', 'mana · ') + skillCooldown(skill.tier) + copy(' с', ' s')}</small>}
            </span>
            {!slot && <span className="rowChevron" aria-hidden="true"/>}
          </button>
          {slot && skill && <select className="buildInlineSelect" aria-label={copy('Уровень навыка', 'Skill level') + ' ' + nameOf(skill)}
            value={slot.level} onChange={event => update({ skills: replaceSlot(state.skills, i, { ...slot, level: Number(event.target.value) }) })}>
            {Array.from({ length: 21 }, (_, lvl) => <option key={lvl} value={lvl + 1}>{lvl + 1} {copy('ур.', 'lvl')}</option>)}
          </select>}
          {slot && skill && <p className="buildSkillEffect">{skillEffect(skill.id, slot.level, state.level, lang).map(row => row.join(' ')).join(' · ')}</p>}
        </div>;
      })}
    </section>

    <section className="card buildPanel buildPreview" aria-labelledby="build-results-title">
      <h2 id="build-results-title">{copy('4. Итоги в бою и баланс', '4. Combat stats & check')}</h2>
      <BattleReadout stats={results}/>
      <BuildAnalysis state={state} lang={lang}/>
    </section>

    <section className="card buildPanel buildPracticeCard" aria-labelledby="build-practice-title">
      <h2 id="build-practice-title">{copy('Проверка в тренировочных боях', 'Practice duel check')}</h2>
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
            if (!open) trackGuide('build:analyze');
            return !open;
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
      <p className="caption buildPresetNote">{copy('Сборка подставит очки, кольца и навыки под твой уровень.', 'Preset fills points, rings and skills for your current level.')}</p>
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
        {(picker.kind === 'ring' ? state.rings[picker.slot] : state.skills[picker.slot]) && <button className="buildPillButton buildClearSlot"
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
      const need = skill.tier - state.points[branch];
      const requirement = state.level < 2 ? (lang ? 'From owl level 2' : 'Со 2-го уровня совы')
        : lang ? `Invest +${need} more in ${statLabels[branch][lang]}` : `Нужно ещё +${need} очк. в ветку`;
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
    title: copy('Есть свободные очки', 'Unspent points'),
    detail: copy(`Осталось ${review.freePoints} очк. Мудрость даёт ману и крит, ловкость — уклонение, выносливость — HP.`,
      `${review.freePoints} points left. Wisdom adds mana & crit, Agility adds dodge, Endurance adds HP.`),
  });
  if (review.skillSlots > 0) notes.push({
    title: copy('Свободные слоты навыков', 'Empty skill slots'),
    detail: copy(`Можно поставить ещё ${review.skillSlots} навык(а) из открытых веток.`,
      `You can equip ${review.skillSlots} more unlocked skill(s).`),
  });
  if (review.ringSlots > 0) notes.push({
    title: copy('Пустые слоты колец', 'Empty ring slots'),
    detail: copy(`Свободно слотов колец: ${review.ringSlots}. Добавь кольца под нужную ветку.`,
      `${review.ringSlots} empty ring slot(s).`),
  });
  if (review.flurryWithoutHint) notes.push({
    title: copy('Вой берсерка без фиксации блока', 'Berserk Howl without guard lock'),
    detail: copy('Бей Воем сразу после попадания, либо добавь Сковывающие цепи / Подсказку духа.',
      'Cast Howl right after hitting an open zone, or pair with Chains / Spirit Guidance.'),
  });
  if (review.overCap.includes('agility')) notes.push({
    title: copy('Уклонение упёрлось в потолок 70%', 'Dodge is capped at 70%'),
    detail: review.movableAgility > 0
      ? copy(`До ${review.movableAgility} очк. ловкости можно перекинуть в другой стат без потери уклонения.`,
        `Up to ${review.movableAgility} Agility points can be moved elsewhere without losing dodge.`)
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
      <strong>{review.mana} · {copy(`хватит на ${rotations} кр.`, `${rotations} full cast(s)`)}</strong>
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
    stun: hasSkill(20) ? copy('Молния проходит через блок и уклонение. В реальном бою прибереги Фазовый сдвиг на её применение.', 'Lightning goes through guard and dodge. In a real fight, save Phase Shift for that cast.')
      : copy('Сравни вариант с большим запасом HP или Фазовым сдвигом. Молния проходит через блок и уклонение.', 'Try more HP or Phase Shift. Lightning goes through guard and dodge.'),
    bastion: state.rings.every(slot => slot?.ring.attribute === 'wisdom')
      ? copy('Все кольца уже дают ману. Попробуй более дешёвый активный навык для затяжного боя.', 'All your rings already add mana. Try a cheaper active skill for drawn-out duels.')
      : copy('Попробуй увеличить запас маны, заменив одно кольцо на кольцо мудрости.', 'Try more mana by swapping one ring for a Wisdom ring.'),
    dodge: [1, 6, 11, 12, 16].some(hasSkill)
      ? copy('У тебя уже есть урон сквозь уклонение. Проверь запас маны для повторного применения.', 'You already have direct damage that bypasses dodge. Check mana for repeat casts.')
      : copy('Против высокого уклонения хорошо работают Молния или Астероид.', 'Try an ability that bypasses dodge, such as Lightning or Asteroid.'),
    assault: hasSkill(9) || hasSkill(6)
      ? copy('У тебя уже есть ответ на частые удары. Прибереги его под серию соперника.', 'You already have an answer to frequent hits. Save it for enemy combos.')
      : copy('Попробуй Статический щит для ответного урона или Снежок для замедления атак.', 'Try Static Shield for retaliation, or Snowball to slow attacks.'),
  };
  const canCompareFullBuilds = state.level >= 5 && (state.budget ?? state.level) >= 8;
  return <div className="buildPracticeResult">
    <div className="buildOverallWinrate">
      <div>
        <small>{copy('Общий винрейт', 'Overall winrate')}</small>
        <p className="caption">
          {result.skillLevel !== undefined && copy(`Навыки врагов ${result.skillLevel} ур.`, `Opponent skills lvl ${result.skillLevel}`)}
          {result.enchant !== undefined && copy(` · заточка +${result.enchant}`, ` · +${result.enchant}`)}
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
