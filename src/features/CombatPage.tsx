import { useState } from 'react';
import builds from '../../public/data/builds.json';
import skills from '../../public/data/skills.json';
import xp from '../../public/data/xp_levels.json';
import { GameArt } from '../ui/GameArt';
import { skillCopy } from './skill-copy';

const branches = [['wisdom','Мудрость'],['strength','Сила'],['agility','Ловкость'],['endurance','Выносливость']] as const;
const modes = [
  ['Рейтинговый бой','Сражайся за место в рейтинге. Победа может дать капсулу при наличии свободного слота.'],
  ['Рейд','Нападай на других игроков. Успешные рейды засчитываются для достижения Outlaw.'],
  ['Додзе','Тренируйся на манекене. Удары дают очки навыков (SP).'],
  ['Полёт','Собирай монеты на трассе и обходи препятствия.'],
  ['Осада сквадов','Атакуй за свой сквад в раундах осады.'],
  ['Wild Magic','Тренируй заклинания. Три максимальные оценки открывают достижение Spell Book.'],
];

export function CombatPage() {
  const [tab, setTab] = useState('skills');
  const [branch, setBranch] = useState<string>('wisdom');
  return <>
    <p className="intro">Выбери, что хочешь узнать о боях и развитии совы.</p>
    <div className="choiceBar" aria-label="Раздел боя">
      {[['skills','Навыки'],['stats','Характеристики'],['modes','Режимы']].map(([id,label]) =>
        <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
      )}
    </div>
    {tab === 'skills' && <section className="card">
      <h2>Боевые навыки</h2>
      <p>Можно экипировать до трёх навыков. Мана расходуется при применении или срабатывании эффекта.</p>
      <label className="field">Ветка навыков <select value={branch} onChange={event => setBranch(event.target.value)}>
        {branches.map(([id,label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      {skills.filter(skill => skill.branch === branch).map(skill => {
        const [title, effect] = skillCopy[skill.id - 1];
        return <details className="mediaDetails" key={skill.id}><summary>
          <GameArt path={`/game/skills/${skill.id}.png`}/>
          <span><strong>{title}</strong><small>{skill.name} · {skill.type === 'active' ? 'Активный' : 'Пассивный'}</small></span>
        </summary><p>{effect}</p><p className="caption">Базовые параметры клиента · мана {skill.mana} · перезарядка {skill.cooldownSeconds} с</p></details>;
      })}
    </section>}
    {tab === 'modes' && <section className="card"><h2>Режимы игры</h2>{modes.map(([title, description]) =>
      <div className="mediaRow" key={title}><div><h3>{title}</h3><p>{description}</p></div></div>
    )}</section>}
    {tab === 'stats' && <>
      <section className="card"><h2>Что даёт каждое очко</h2>
        <p><strong>Сила.</strong> +0,065 к базовому урону за очко.</p>
        <p><strong>Ловкость.</strong> +0,7 п. п. к уклонению, максимум 70%.</p>
        <p><strong>Мудрость.</strong> +20 маны и +0,7 п. п. к шансу критического удара, максимум 70%.</p>
        <p><strong>Выносливость.</strong> +3 здоровья за очко в бою. Базовое боевое здоровье — 20.</p>
      </section>
      <section className="card"><h2>Прокачка и билды</h2><p>Стоимость улучшения перка — 10 × 2 в степени текущего уровня, в очках навыков (SP).</p>
        <details><summary>Опыт по уровням</summary>{xp.slice(1).map((value, index) => <div className="mediaRow" key={index}><span>Уровень {index+1}</span><strong>{value.toLocaleString('ru-RU')} XP</strong></div>)}</details>
        {builds.builds.map(build => <details key={build.id}><summary>{build.name.split(' (')[0]}</summary><p>{build.playstyle}</p><p>{build.best_gear}</p></details>)}
      </section>
    </>}
  </>;
}
