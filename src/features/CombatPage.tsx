import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import skills from '../../public/data/skills.json';
import progression from './owl-progression.json';
import { GameArt } from '../ui/GameArt';
import { skillCopy } from './skill-copy';
import skillLevels from './skill-levels.json';

const branches = [
  ['wisdom', 'Мудрость', 'Критический удар и мана', 1],
  ['strength', 'Сила', 'Урон по противнику', 11],
  ['agility', 'Ловкость', 'Уклонение и контроль', 6],
  ['endurance', 'Выносливость', 'Здоровье и защита', 16],
] as const;
const modes = [
  ['Рейтинговый бой', 'Рейтинг и капсулы', 'Атакуй зоны, которые соперник не блокирует, и переключай свой блок. Победа может дать капсулу при наличии слота.'],
  ['Рейд', 'С 1-го уровня', 'Нападай на других игроков. Успешные рейды засчитываются для достижения Outlaw.'],
  ['Додзе', 'Навыки со 2-го уровня', 'Бей манекен, чтобы заработать SP. Трать SP на улучшения, а очки атрибута — на открытие навыков его ветки.'],
  ['Сквады и осады', 'Сквады с 3-го · война с 4-го', 'Вступи в сквад и участвуй в атаках по раундам. Активность засчитывается для достижений сквада.'],
  ['Полёт', 'С 5-го уровня', 'Собирай монеты на трассе и обходи препятствия.'],
  ['Wild Magic', 'Тренировка заклинаний', 'Три максимальные оценки открывают достижение Spell Book.'],
  ['Книга загадок', '60 секунд на ответ', 'Сотри поле, чтобы открыть загадку и запустить таймер. Серия верных ответов умножает монеты и XP до ×3. Верный ответ даёт +5 мудрости на 24 часа. После трёх ошибок книга сгорает.'],
  ['Сезон', '14 дней', 'В каждом сезоне одна цель: лайки, победы, безупречные победы, монеты или дистанция в полёте, лучший полёт, загадки или удары в Додзе. Учитывается активность за текущий сезон.'],
] as const;
const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const skillArt = (id: number) => '/game/skills/' + id + '.png';
type Skill = typeof skills[number];

export function CombatPage() {
  const { pathname } = useLocation();
  const [, , page, branchId, skillId] = pathname.split('/');
  const [isStats, isModes] = [page === 'stats', page === 'modes'];
  const branch = branches.find(item => item[0] === branchId);
  const skill = skills.find(item => item.id === Number(skillId) && item.branch === branchId);
  return <>
    {!branch && <nav className="choiceBar" aria-label="Раздел боя">
      <Link to="/combat" aria-current={!page ? 'page' : undefined}>Навыки</Link>
      <Link to="/combat/stats" aria-current={isStats ? 'page' : undefined}>Характеристики</Link>
      <Link to="/combat/modes" aria-current={isModes ? 'page' : undefined}>Режимы</Link>
    </nav>}
    {skill ? <SkillDetail key={skill.id} skill={skill}/> :
      branch ? <>
        <h2 className="subTitle">{branch[1]}</h2>
        <section className="card">
          <p className="caption">Открывай навыки по порядку. На каждый нужен 1 свободный балл этой ветки.</p>
          {skills.filter(item => item.branch === branch[0]).sort((a, b) => a.tier - b.tier).map(item =>
            <Link to={'/combat/skills/' + branch[0] + '/' + item.id} className="mediaRow skillRow" key={item.id}>
              <GameArt path={skillArt(item.id)} size={42}/>
              <span><strong>{skillCopy[item.id - 1][0]}</strong><small>Ступень {item.tier} · {item.type === 'active' ? 'Активный' : 'Пассивный'}</small></span>
            </Link>)}
        </section>
      </> : isModes ? <section className="card">
        {modes.map(([title, when, description]) => <details className="mediaDetails" key={title}>
          <summary><span><strong>{title}</strong><small>{when}</small></span></summary><p>{description}</p>
        </details>)}
      </section> : isStats ? <CombatStats/> : <>
        <p className="intro">Ветки навыков открываются на 2-м уровне. В бой можно взять до трёх навыков.</p>
        <div className="catalogGrid">
          {branches.map(([id, title, purpose, icon]) =>
            <Link className="catalogTile" to={'/combat/skills/' + id} key={id}>
              <GameArt path={skillArt(icon)} size={48}/><strong>{title}</strong><small>{purpose}</small>
            </Link>
          )}
        </div>
        <section className="card"><h2>Как прокачивать</h2><p>Вложи очко в нужный атрибут и открой следующий навык ветки. Затем прокачивай его за SP. SP дают тренировки в Додзе и применение навыков в бою.</p></section>
      </>}
  </>;
}

function SkillDetail({ skill }: { skill: Skill }) {
  const [level, setLevel] = useState(1);
  const [title, description] = skillCopy[skill.id - 1];
  const cooldown = [8, 10, 12, 15, 20][skill.tier - 1];
  const levels = skillLevels[String(skill.id) as keyof typeof skillLevels];
  const { type, dur, value } = levels;
  const amount = value[level - 1];
  const seconds = dur[level - 1];
  const effect = ['strike','heal','chill','desperate','meteor','poison','burn'].includes(type)
    ? format.format(amount) + ' HP'
    : ['evade','flurry'].includes(type) ? Math.floor(amount) + (amount % 1 ? '–' + Math.ceil(amount) : '')
    : amount ? Math.trunc(amount) + '%' : '';
  const effectTitle: Partial<Record<string, string>> = {
    heal: 'Лечение', poison: 'Урон за атаку врага', reflect: 'Отражение', empower: 'Усиление удара',
    shield: 'Снижение урона', evade: 'Уклонений', flurry: 'Ударов', cleanse: 'Ослабление эффектов',
    lifesteal: 'Лечение от урона', gamble: 'Шанс ×5', echo: 'Дополнительный урон',
  };
  return <section className="card">
    <div className="mediaHeading"><GameArt path={skillArt(skill.id)} size={64}/><div>
      <h2>{title}</h2><p>{skill.name} · ступень {skill.tier}</p>
    </div></div>
    <p>{description}</p>
    <p className="caption">Открытие: 1 очко ветки{skill.tier > 1 ? ' после изучения предыдущего навыка' : ' со 2-го уровня совы'}.</p>
    <label className="field">Уровень навыка
      <select value={level} onChange={event => setLevel(Number(event.target.value))}>
        {Array.from({ length: 21 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
    </label>
    <ul className="compactList">
      {effect && <li className="mediaRow"><span>{effectTitle[type] ?? 'Базовый урон'}</span><strong>{effect}</strong></li>}
      {type === 'burn' && 'dps' in levels && <li className="mediaRow"><span>Поджог</span><strong>{format.format(levels.dps[level - 1])} HP/с</strong></li>}
      {seconds > 0 && <li className="mediaRow"><span>{type === 'poison' ? 'Срабатываний' : 'Длительность'}</span><strong>{type === 'poison' ? Math.round(seconds) : format.format(seconds) + ' с'}</strong></li>}
      <li className="mediaRow"><span>{skill.type === 'active' ? 'Мана за применение' : 'Мана за срабатывание'}</span>
        <strong>{skill.type === 'active' ? 25 * skill.tier : type === 'reveal' ? 20 : 2 * skill.tier}</strong></li>
      {skill.type === 'active' && <li className="mediaRow"><span>Перезарядка</span><strong>{cooldown} с</strong></li>}
      <li className="mediaRow"><span>{level === 21 ? 'Прокачка' : `Улучшение до ${level + 1}-го уровня`}</span>
        <strong>{level === 21 ? 'Максимум' : format.format(100 * 2 ** (level - 1)) + ' SP'}</strong></li>
    </ul>
    {effect.endsWith(' HP') && <p className="caption">Показан базовый эффект без прибавки за выносливость.</p>}
  </section>;
}

const attributes = [
  ['Сила', 'Урон', '+0,065 за очко', 'Удары сильнее.'],
  ['Ловкость', 'Уклонение', '+0,7 п. п. за очко', 'Предел уклонения — 70%.'],
  ['Мудрость', 'Крит и мана', '+0,7 п. п. и +20 маны за очко', 'Предел крита — 70%. Базовая мана — 200.'],
  ['Выносливость', 'Здоровье', '+2 HP дома, +3 HP в бою за очко', 'Базовое боевое здоровье — 20 HP.'],
] as const;

function CombatStats() {
  const [level, setLevel] = useState(0);
  const [owlLevel, setOwlLevel] = useState(2);
  const [legacy, setLegacy] = useState(false);
  const curve = legacy ? progression.previous : progression.current;
  return <>
    <section className="card"><h2>Эффект одного очка атрибута</h2>
      <ul className="compactList">{attributes.map(([name, use, effect, detail]) => <li className="mediaRow" key={name}>
        <div><h3>{name} · {use}</h3><p><strong>{effect}</strong></p><small>{detail}</small></div>
      </li>)}</ul>
    </section>
    <section className="card"><h2>Перки и опыт</h2>
      <p>Перки покупаются за SP. Запас энергии растёт на 100 за ступень. Восстановление энергии и здоровья растёт на 3% за ступень соответствующего перка.</p>
      <details><summary>Цены перков по уровням</summary>
        <label className="field">Текущий уровень перка
          <select value={level} onChange={event => setLevel(Number(event.target.value))}>
            {Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
        <p>Следующий уровень: <strong>{format.format(10 * 2 ** level)} SP</strong>. Максимум — 21.</p>
      </details>
      <details><summary>Опыт для уровня совы</summary>
        <label className="field">Версия прогрессии
          <select value={legacy ? 'legacy' : 'current'} onChange={event => {
            const previous = event.target.value === 'legacy';
            setLegacy(previous);
            setOwlLevel(value => Math.min(value, (previous ? progression.previous : progression.current).length - 1));
          }}><option value="current">Текущая</option><option value="legacy">До 14 ноября 2026</option></select>
        </label>
        <label className="field">Целевой уровень
          <select value={owlLevel} onChange={event => setOwlLevel(Number(event.target.value))}>
            {curve.slice(1).map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
          </select>
        </label>
        <p>Всего <strong>{format.format(curve[owlLevel])} XP</strong>, из них {format.format(curve[owlLevel] - curve[owlLevel - 1])} XP с предыдущего уровня.</p>
      </details>
    </section>
  </>;
}
