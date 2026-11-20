import { useRef, useState, type ReactNode } from 'react';
import { battleStats, skillCooldown, skillMana } from '../domain/combat';
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

function initialBuild(level = 20, budget: number | null = null, buffs = emptyAttributes): BuildState {
  return { level, budget, points: emptyAttributes, buffs, rings: emptySlots, skills: emptySlots };
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
  const [state, setState] = useState(initialBuild);
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const levelRef = useRef<HTMLSelectElement>(null);
  const guideRef = useRef<HTMLHeadingElement>(null);
  const spent = totalAttributes(state.points);
  const budget = state.budget ?? state.level;
  const left = budget - spent;
  const total = { ...state.points };
  for (const stat of statKeys) total[stat] += state.buffs[stat];
  for (const slot of state.rings) if (slot) total[slot.ring.attribute] += slot.ring.bonus + slot.enchant;
  const results = battleStats(state.level, total.strength, total.agility, total.wisdom, total.endurance);
  const nameOf = (skill: typeof combatSkills[number]) => lang ? skill.name : skill.title;
  const update = (change: Partial<BuildState>) => setState(s => validateBuild({ ...s, ...change }));
  const updateAttribute = (stat: StatKey, getAmount: (current: number) => number) => {
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
    const next: BuildState = { ...state, points: presetAttributes(build, state.level, budget) };
    next.rings = build.rings.map(attribute => {
      const ring = ringCatalog.filter(ring => ring.attribute === attribute && ring.minLevel <= state.level)
        .sort((a, b) => b.tier - a.tier)[0];
      return ring ? { ring, enchant: 0 } : null;
    });
    const readySkills = build.skills.filter(id => skillAvailable(id, next));
    next.skills = emptySlots.map((_, i) => readySkills[i] ? { id: readySkills[i], level: 1 } : null);
    setState(next);
    levelRef.current?.focus();
  }

  return <div className="buildConstructor">
    <section className="card buildPanel" aria-labelledby="build-level-title">
      <div className="buildHeading">
        <h2 id="build-level-title">{copy('Калькулятор билда', 'Build calculator')}</h2>
        <button type="button" className="buildTextButton" onClick={() => {
          lightHaptic();
          setState(initialBuild(state.level, state.budget, state.buffs));
        }}>{copy('Сбросить билд', 'Reset build')}</button>
      </div>
      <button className="buildGuideLink" type="button" onClick={() => {
        lightHaptic();
        guideRef.current?.focus({ preventScroll: true });
        guideRef.current?.scrollIntoView({ block: 'start' });
      }}>{copy('Руководство по билдам', 'Build guide')} <span className="rowChevron" aria-hidden="true"/></button>
      <div className="buildSetup">
        <label className="field">{copy('Уровень совы', 'Owl level')}
          <select ref={levelRef} value={state.level} onChange={event => update({ level: Number(event.target.value) })}>
            {Array.from({ length: maxLevel }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <div className="buildBudget"><small>{copy('Свободно очков', 'Unspent points')}</small><strong>{left} <small>/ {budget}</small></strong></div>
      </div>

      <div className="buildAttributes">
        {statKeys.map(stat => {
          const bonus = total[stat] - state.points[stat];
          return <div className="buildAttributeRow" key={stat}>
            <GameAttribute name={stat}/>
            <span><strong>{statLabels[stat][lang]}</strong>
              {bonus > 0 && <small>{copy('С бонусами', 'With bonuses')} {total[stat]} (+{bonus})</small>}</span>
            <div className="buildStepper">
              <button type="button" aria-label={copy('Уменьшить', 'Decrease') + ' · ' + statLabels[stat][lang]}
                disabled={state.points[stat] === 0} onClick={() => step(stat, -1)}>−</button>
              <AttributeInput name={statLabels[stat][lang]} value={state.points[stat]} onCommit={value => updateAttribute(stat, () => value)}/>
              <button type="button" aria-label={copy('Увеличить', 'Increase') + ' · ' + statLabels[stat][lang]}
                disabled={left === 0} onClick={() => step(stat, 1)}>+</button>
            </div>
          </div>;
        })}
      </div>

      <BattleReadout stats={results}/>
      <p className="caption buildReadoutNote">{copy('Урон показан до блока, округления и прочих эффектов.', 'Damage is shown before blocks, rounding and other effects.')}</p>
      <details className="mediaDetails buildAdvanced">
        <summary><strong>{copy('Свои очки и временные баффы', 'Custom points and temporary buffs')}</strong></summary>
        <p className="caption">{copy('Укажи свой общий запас очков, если он отличается от уровня. Баффы осады и книги прибавляются к боевым параметрам, а доступ к навыкам зависит от вложенных очков.', 'Enter your actual point total if it differs from your level. Siege and book buffs affect combat stats. Only invested points unlock skills.')}</p>
        <label className="field">{copy('Всего очков для распределения', 'Total points to allocate')}
          <input value={budgetDraft ?? state.budget ?? ''} placeholder={String(state.level)} inputMode="numeric" maxLength={3}
            onChange={event => setBudgetDraft(event.target.value.replace(/\D/g, ''))}
            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            onBlur={() => {
              if (budgetDraft !== null) update({ budget: budgetDraft === '' ? null : Number(budgetDraft) });
              setBudgetDraft(null);
            }}/>
        </label>
        <small>{copy('Очки меняются после выхода из поля.', 'Points update when you leave the field.')}</small>
        <div className="calculatorGrid">{statKeys.map(stat => <label className="field" key={stat}>
          <span><GameAttribute name={stat}/> {statLabels[stat][lang]}</span>
          <input value={state.buffs[stat] || ''} placeholder="0" inputMode="numeric" maxLength={3}
            onChange={event => update({ buffs: { ...state.buffs, [stat]: Number(event.target.value.replace(/\D/g, '')) } })}/>
        </label>)}</div>
      </details>
    </section>

    <section className="card buildPanel" aria-labelledby="build-rings-title">
      <h2 id="build-rings-title">{copy('Кольца', 'Rings')}</h2>
      <p className="caption">{copy('Три слота. Заточка добавляет по одному очку к атрибуту кольца.', 'Three slots. Each sharpening level adds one point to the ring’s attribute.')}</p>
      {state.rings.map((slot, i) => <div className="buildEquip" key={i}>
        <button type="button" className="buildEquipMain" onClick={() => { lightHaptic(); setPicker({ kind: 'ring', slot: i }); }}>
          <GameArt path={ringArt(slot?.ring.id ?? 'ring-wit-1')} size={34}/>
          <span><strong>{slot ? slot.ring.title : copy('Выбрать кольцо', 'Choose ring') + ' ' + (i + 1)}</strong>
            {slot && <small>+{slot.ring.bonus + slot.enchant} · {statLabels[slot.ring.attribute][lang]}</small>}</span>
          <span className="rowChevron" aria-hidden="true"/>
        </button>
        {slot && <label className="field buildEquipLevel">{copy('Заточка', 'Sharpening')}
          <select aria-label={copy('Заточка кольца', 'Ring sharpening') + ' ' + (i + 1)} value={slot.enchant}
            onChange={event => update({ rings: replaceSlot(state.rings, i, { ...slot, enchant: Number(event.target.value) }) })}>
            {Array.from({ length: 21 }, (_, value) => <option key={value} value={value}>+{value}</option>)}
          </select>
        </label>}
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
              {skill && <small>{skillMana(skill.tier, passive(skill), skill.id === 10)} {passive(skill)
                ? copy('маны за срабатывание', 'mana per trigger')
                : copy('маны · ', 'mana · ') + skillCooldown(skill.tier) + copy(' с перезарядки', ' s cooldown')}</small>}
            </span>
            <span className="rowChevron" aria-hidden="true"/>
          </button>
          {slot && skill && <>
            <label className="field buildEquipLevel">{copy('Уровень', 'Level')}
              <select aria-label={copy('Уровень навыка', 'Skill level') + ' ' + nameOf(skill)} value={slot.level}
                onChange={event => update({ skills: replaceSlot(state.skills, i, { ...slot, level: Number(event.target.value) }) })}>
                {Array.from({ length: 21 }, (_, value) => <option key={value} value={value + 1}>{value + 1}</option>)}
              </select>
            </label>
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
          <button className="secondary" type="button" onClick={() => applyPreset(build)}>{copy('Применить билд', 'Apply build')}</button>
        </details>;
      })}
      <p className="caption">{copy('Сборки — примеры применения навыков. В рейтинговом бою результат зависит от соперника, блока и действий игроков.', 'These builds illustrate skill combinations. Ranked results depend on the opponent, guard and decisions during the fight.')}</p>
    </section>

    {picker && <BuildPicker key={picker.kind} title={picker.kind === 'ring' ? copy('Выбрать кольцо', 'Choose ring') : copy('Выбрать навык', 'Choose skill')}
      closeLabel={copy('Закрыть', 'Close')} onClose={() => setPicker(null)}>
      <div className="buildPickerOptions">
        {(picker.kind === 'ring' ? state.rings[picker.slot] : state.skills[picker.slot]) && <button className="buildTextButton"
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
  useModal(ref, true);
  return <dialog className="modal buildPickerModal" ref={ref} aria-labelledby="build-picker-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialogBody">
      <header className="buildHeading"><h2 id="build-picker-title" data-dialog-title tabIndex={-1}>{title}</h2>
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
    {selected && <span aria-hidden="true">✓</span>}
  </button>;
}
