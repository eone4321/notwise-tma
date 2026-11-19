import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import skills from '../../public/data/skills.json';
import progression from './owl-progression.json';
import { GameSymbol } from '../ui/GameSymbol';
import { GameArt } from '../ui/GameArt';
import { skillCopy } from './skill-copy';
import skillLevels from './skill-levels.json';
import { battleLeagues } from './battle-leagues';
import { battleStats, skillHpMultiplier } from '../domain/combat';

export function SpBadge({ value }: { value?: number | string }) {
  return <span className="spBadge">
    {value !== undefined && <span className="spValue">{typeof value === 'number' ? value.toLocaleString('ru-RU') : value}</span>}
    <GameSymbol name="sp" size={14}/>
  </span>;
}

const branches = [
  ['wisdom', 'Мудрость', 'Критический удар и мана', 1],
  ['strength', 'Сила', 'Урон по противнику', 11],
  ['agility', 'Ловкость', 'Уклонение и контроль', 6],
  ['endurance', 'Выносливость', 'Здоровье и защита', 16],
] as const;
const modes = [
  ['swords', 'Рейтинговый бой', 'Рейтинг и капсулы', 'Атакуй зоны, которые соперник не блокирует, и переключай свой блок. Победа может дать капсулу при наличии свободного слота.'],
  ['target', 'Рейд', 'С 1-го уровня', 'Нападай на сов из рейтинга. Проигравший отдаёт победителю 3% монет. После трёх проигранных рейдов сова защищена до возвращения игрока.'],
  ['boxing', 'Додзе', 'Со 2-го ур. · 2 ⚡ за удар', 'Обычный удар по манекену тратит 2 энергии и приносит SP. Навыки тоже можно тренировать на манекене. Трать SP на улучшения, а очки атрибута — на открытие навыков его ветки.'],
  ['shield', 'Сквады и осады', 'Сквады с 3-го · война с 4-го', 'Раунд длится 8 часов. Территория приносит серебро сквада, монеты или +1–2 к атрибуту. Чтобы забрать награду своего сквада за раунд, участвуй в атаке. Усиление действует 24 часа после получения.'],
  ['rocket', 'Полёт', 'С 5-го уровня · от 250 энергии', 'Для полёта нужно не меньше 10 сытости. В полёте можно собрать монеты, получить опыт и выбить капсулу при наличии слота. Игра выдаёт 3 ракеты в день, дополнительные можно подобрать на трассе. Ракета умножает монеты, суши забирает 20%.'],
  ['bolt', 'Wild Magic', 'Тренировка заклинаний', 'Три максимальные оценки открывают достижение Spell Book.'],
  ['magnifier', 'Книга загадок', '60 секунд на ответ', 'Сотри поле, чтобы открыть загадку и запустить таймер. Серия верных ответов умножает монеты и XP до ×3. Верный ответ даёт +5 мудрости на 24 часа. После трёх ошибок книга сгорает.'],
  ['trophy', 'Сезон', '14 дней', 'В каждом сезоне одна цель: лайки, победы, безупречные победы, монеты или дистанция в полёте, лучший полёт, загадки или удары в Додзе. Учитывается активность за текущий сезон.'],
] as const;
const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const precise = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });
const hpEffects = new Set(['strike', 'heal', 'chill', 'desperate', 'meteor', 'poison', 'burn']);
const branchName = (branch: string) => branches.find(([id]) => id === branch)?.[1] ?? '';
function unlockCondition(skill: Skill) {
  const previous = skills.find(item => item.branch === skill.branch && item.tier === skill.tier - 1);
  return previous
    ? `После «${skillCopy[previous.id - 1][0]}» · ещё 1 очко ветки «${branchName(skill.branch)}»`
    : `Со 2-го уровня совы: вложи 1 очко в «${branchName(skill.branch)}»`;
}
const skillArt = (id: number) => '/game/skills/' + id + '.png';
type Skill = typeof skills[number];

export function CombatPage() {
  const { pathname, hash } = useLocation();
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
          <p className="caption">С уровня 2 открой дерево навыков. В характеристиках вложи свободное очко атрибута в эту ветку, затем изучи навык за полученное очко ветки. Очки <SpBadge/> из Додзе нужны для улучшений.</p>
          {skills.filter(item => item.branch === branch[0]).sort((a, b) => a.tier - b.tier).map(item =>
            <Link to={'/combat/skills/' + branch[0] + '/' + item.id} className="mediaRow skillRow" key={item.id}>
              <GameArt path={skillArt(item.id)} size={42}/>
              <span><strong>{skillCopy[item.id - 1][0]}</strong><small>{unlockCondition(item)}</small></span>
              <span className="rowChevron" aria-hidden="true"/>
            </Link>)}
        </section>
      </> : isModes ? <section className="card">
        {modes.map(([icon, title, when, description]) => <details className="mediaDetails" key={title}
          id={icon === 'rocket' ? 'flight' : undefined} open={icon === 'rocket' && hash === '#flight' || undefined}>
          <summary><GameSymbol name={icon}/><span><strong>{title}</strong>
            <small>{icon === 'rocket' ? <span className="energyBadge">С 5-го уровня · от 250 <GameSymbol name="bolt" size={13}/></span> :
              icon === 'boxing' ? <span className="energyBadge">Со 2-го уровня · 2 <GameSymbol name="bolt" size={13}/> / удар</span> : when}</small></span>
          </summary>
          {icon === 'rocket' ? <FlightDetails/> : <p>{description}</p>}
          {icon === 'swords' && <p>Зон три: голова, корпус и живот. Попадание в выбранную соперником зону блока не наносит урона. Базовый откат атаки в клиенте — 1,5 с, смены блока — 1 с. Перезарядку и итог рейтингового боя показывает игра.</p>}
          {icon === 'target' && <p>Ориентир расхода энергии — 20 на 5–9-м уровне, 30 на 10–14-м. Стоимость растёт на 10 каждые пять уровней, начиная с 10 энергии на уровнях 1–4.</p>}
        </details>)}
        <details className="mediaDetails"><summary><GameSymbol name="trophy"/><span><strong>Призы сезона</strong><small>Первые 100 мест</small></span></summary>
        <p>Базовый фонд клиента — 1 млн $NOT. 1-е место получает 400 000, 2-е — 350 000, 3-е — 250 000 $NOT. Топ-10 получает золотое загадочное яйцо, места 11–100 — белое загадочное яйцо на красном фоне.</p>
        <p className="caption">Игра может изменить фонд конкретного сезона. Призы приходят автоматически.</p>
        <Link className="textLink" to="/owl/season">Что выпадает из белого загадочного яйца</Link>
      </details>
      <details className="mediaDetails" id="leagues" open={hash === "#leagues" || undefined}><summary><GameSymbol name="shield"/><span><strong>Боевые лиги</strong><small>Пороги рейтинга и бонус к фарму</small></span></summary>
        <table className="priceTable">
          <thead><tr><th scope="col">Лига</th><th scope="col">От MMR</th><th scope="col">Фарм</th></tr></thead>
          <tbody>{battleLeagues.map(([name, rating], index) => <tr key={name}>
            <th scope="row">{name}</th><td>{format.format(rating)}</td><td>+{index + 1}%</td>
          </tr>)}</tbody>
        </table>
      </details>
    </section> : isStats ? <CombatStats/> : <>
        <p className="intro">Ветки навыков открываются на 2-м уровне. В бой можно взять до трёх навыков.</p>
        <div className="catalogGrid">
          {branches.map(([id, title, purpose, icon]) =>
            <Link className="catalogTile" to={'/combat/skills/' + id} key={id}>
              <GameArt path={skillArt(icon)} size={48}/><strong>{title}</strong><small>{purpose}</small>
            </Link>
          )}
        </div>
        <section className="card"><h2>Как прокачивать</h2><p>Вложи очко в нужный атрибут и открой следующий навык ветки. Затем прокачивай его за <SpBadge/>. Очки <SpBadge/> дают тренировки в Додзе и применение навыков в бою.</p></section>
      </>}
  </>;
}

function SkillDetail({ skill }: { skill: Skill }) {
  const [level, setLevel] = useState(1);
  const [owlLevel, setOwlLevel] = useState(20);
  const [title, description] = skillCopy[skill.id - 1];
  const cooldown = [8, 10, 12, 15, 20][skill.tier - 1];
  const levels = skillLevels[String(skill.id) as keyof typeof skillLevels];
  const { type, dur, value } = levels;
  const amount = value[level - 1];
  const seconds = dur[level - 1];
  const scalesWithLevel = hpEffects.has(type);
  const multiplier = skillHpMultiplier(owlLevel);
  const floor = Math.floor(amount);
  const effect = scalesWithLevel ? precise.format(amount * multiplier) + ' HP'
    : type === 'evade' || type === 'flurry'
      ? (amount - floor < 0.05 ? String(floor) : amount - floor > 0.95 ? String(floor + 1) : `${floor}–${floor + 1}`)
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
    <div className="skillUnlock"><strong>Условие открытия</strong><p>{unlockCondition(skill)}.</p></div>
    <label className="field">Уровень навыка
      <select value={level} onChange={event => setLevel(Number(event.target.value))}>
        {Array.from({ length: 21 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
    </label>
    {scalesWithLevel && <label className="field">Уровень совы
      <select value={owlLevel} onChange={event => setOwlLevel(Number(event.target.value))}>
        {progression.current.slice(1).map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
      </select>
    </label>}
    <ul className="compactList">
      {effect && <li className="mediaRow"><span>{effectTitle[type] ?? 'Базовый урон'}</span><strong>{effect}</strong></li>}
      {type === 'burn' && 'dps' in levels && <li className="mediaRow"><span>Поджог</span><strong>{precise.format(levels.dps[level - 1] * multiplier)} HP/с</strong></li>}
      {seconds > 0 && <li className="mediaRow"><span>{type === 'poison' ? 'Срабатываний' : 'Длительность'}</span><strong>{type === 'poison' ? Math.round(seconds) : format.format(seconds) + ' с'}</strong></li>}
      <li className="mediaRow"><span>{skill.type === 'active' ? 'Мана за применение' : 'Мана за срабатывание'}</span>
        <strong>{skill.type === 'active' ? 25 * skill.tier : type === 'reveal' ? 20 : 2 * skill.tier}</strong></li>
      <li className="mediaRow"><span>Тренировка в Додзе</span><strong className="energyBadge">{skill.dojoEnergy} <GameSymbol name="bolt" size={15}/></strong></li>
      {skill.type === 'active' && <li className="mediaRow"><span>Перезарядка</span><strong>{cooldown} с</strong></li>}
      <li className="mediaRow"><span>{level === 21 ? 'Прокачка' : `Улучшение до ${level + 1}-го уровня`}</span>
        <strong>{level === 21 ? 'Максимум' : <SpBadge value={format.format(100 * 2 ** (level - 1))}/>}</strong></li>
    </ul>
    {scalesWithLevel && <p className="caption">Множитель от уровня совы ×{precise.format(multiplier)}. Показан исходный эффект до защиты цели и других боевых модификаторов.</p>}
  </section>;
}

const attributes = [
  ['muscle', 'Сила', '+0,065 урона за очко', 'Повышает урон обычных ударов.'],
  ['target', 'Ловкость', '+0,7% к шансу уклонения за очко', 'Шанс складывается. Например, с 20% он вырастет до 20,7%. Предел — 70%.'],
  ['bolt', 'Мудрость', '+0,7% к шансу крита и +20 маны за очко', 'Например, шанс крита 20% вырастет до 20,7%. Предел — 70%. Базовая мана — 200.'],
  ['heart', 'Выносливость', '+2 HP за очко', 'К базовым 20 HP прибавляются 3 HP за каждый уровень совы и 2 HP за каждое очко выносливости.'],
] as const;

function CombatStats() {
  const [level, setLevel] = useState(0);
  const [owlLevel, setOwlLevel] = useState(2);
  const curve = progression.current;
  return <>
    <section className="card"><h2>Эффект одного очка атрибута</h2>
      {attributes.map(([icon, name, effect, detail]) => <details className="mediaDetails" key={name}>
        <summary><GameSymbol name={icon}/><span><strong>{name}</strong><small>{effect}</small></span></summary>
        <p>{detail}</p>
      </details>)}
    </section>
    <BattleStatsCalculator/>
    <section className="card"><h2>Улучшения совы</h2>
      <p>Перки — постоянные улучшения совы за <SpBadge/> (очки навыков). У каждого улучшения свой уровень.</p>
      <ul className="compactList owlUpgrades">
        <li><GameSymbol name="bolt" size={24}/><span>Запас энергии</span><b>+100 <GameSymbol name="bolt" size={13}/> за ур.</b></li>
        <li><GameSymbol name="rocket" size={24}/><span>Восстановление энергии</span><b>+3% за уровень</b></li>
        <li><GameSymbol name="heart" size={24}/><span>Восстановление здоровья</span><b>+3% за уровень</b></li>
      </ul>
      <details><summary>Стоимость прокачки перков совы</summary>
        <p className="caption">Каждый из трёх перков выше (Запас энергии, Восстановление энергии и Восстановление здоровья) прокачивается отдельно от 0 до 21 уровня за <SpBadge/>. Стоимость удваивается с каждым следующим уровнем: 10, 20, 40, 80… <SpBadge/>.</p>
        <label className="field">Текущий уровень перка
          <select value={level} onChange={event => setLevel(Number(event.target.value))}>
            {Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i} → {i + 1} ур.</option>)}
          </select>
        </label>
        <p>Стоимость улучшения: <strong><SpBadge value={format.format(10 * 2 ** level)}/></strong></p>
      </details>
      <details><summary>Опыт для уровня совы</summary>
        <label className="field">Целевой уровень совы
          <select value={owlLevel} onChange={event => setOwlLevel(Number(event.target.value))}>
            {curve.slice(1).map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
          </select>
        </label>
        <p>Всего: <strong>{format.format(curve[owlLevel])} XP</strong> (из них {format.format(curve[owlLevel] - curve[owlLevel - 1])} XP с предыдущего уровня).</p>
      </details>
    </section>
  </>;
}

const statInputs = [
  ['level', 'Уровень совы'], ['strength', 'Сила'], ['agility', 'Ловкость'],
  ['wisdom', 'Мудрость'], ['endurance', 'Выносливость'],
] as const;

function BattleStatsCalculator() {
  const [input, setInput] = useState({ level: '20', strength: '', agility: '', wisdom: '', endurance: '' });
  const stats = battleStats(Number(input.level), Number(input.strength), Number(input.agility), Number(input.wisdom), Number(input.endurance));

  return <details className="card" id="battle-calculator">
    <summary><strong>Калькулятор боевых характеристик</strong></summary>
    <p className="caption">Введи итоговые атрибуты из профиля совы с учётом экипировки и усилений.</p>
    <div className="quoteInputs">
      {statInputs.map(([key, label]) => <label className="field" key={key}>{label}
        <input inputMode="numeric" value={input[key]} placeholder="0" maxLength={4}
          onChange={event => setInput({ ...input, [key]: event.target.value.replace(/\D/g, '') })}/>
      </label>)}
    </div>
    <dl className="analyticsRows" aria-live="polite">
      <div><dt>Здоровье</dt><dd>{precise.format(stats.health)} HP</dd></div>
      <div><dt>Мана</dt><dd>{precise.format(stats.mana)}</dd></div>
      <div><dt>Базовый урон удара</dt><dd>{precise.format(stats.hit)} HP</dd></div>
      <div><dt>Шанс уклонения</dt><dd>{precise.format(stats.dodge)}%</dd></div>
      <div><dt>Шанс крита</dt><dd>{precise.format(stats.crit)}%</dd></div>
    </dl>
  </details>;
}

function FlightDetails() {
  return <div className="flightDetails">
    <h4>Расход энергии на старт</h4>
    <div className="flightEnergyGrid">
      <div><span>Уровни 5–9</span><strong>250 <GameSymbol name="bolt" size={15}/></strong></div>
      <div><span>Уровни 10–14</span><strong>300 <GameSymbol name="bolt" size={15}/></strong></div>
      <div><span>Уровни 15–19</span><strong>350 <GameSymbol name="bolt" size={15}/></strong></div>
      <div><span>Каждые +5 ур.</span><strong>+50 <GameSymbol name="bolt" size={15}/></strong></div>
    </div>

    <h4>Баффы и предметы на трассе</h4>
    <ul className="compactList flightItemsList">
      <li>
        <span className="flightItemHead"><GameSymbol name="rocket" size={20}/><strong>Ракета</strong></span>
        <p>Полная неуязвимость к препятствиям, ускорение и умножение монет. Даётся 3 в день (+ сбор на трассе).</p>
      </li>
      <li>
        <span className="flightItemHead"><GameSymbol name="magnet" size={20}/><strong>Магнит (10 сек)</strong></span>
        <p>Автоматически притягивает все монеты со всех трёх дорожек в течение 10 секунд.</p>
      </li>
      <li>
        <span className="flightItemHead"><span className="emojiIcon">🍣</span><strong>Суши (Механика риска)</strong></span>
        <p>Каждая пойманная суши отнимает <strong>20% текущего счёта</strong>, кроме третьей. Она прибавляет <strong>20%</strong> к оставшимся монетам и открывает секретный стикер <strong>#042 Sushi Master</strong>.</p>
      </li>
    </ul>

    <h4>Дебаффы и ловушки на трассе</h4>
    <ul className="compactList flightItemsList flightDebuffs">
      <li>
        <span className="flightItemHead"><GameSymbol name="cocktail" size={20}/><strong>Коктейль · Реверс (10 сек)</strong></span>
        <p>Инвертирует управление на 10 секунд (влево и вправо меняются местами) и искажает звук (замедление трека и эхо).</p>
      </li>
      <li>
        <span className="flightItemHead"><GameSymbol name="magnifier" size={20}/><strong>Лупа · Зум камеры (10 сек)</strong></span>
        <p>Приближает камеру в 1.5× раза на 10 секунд, срезая обзор — сосны и препятствия появляются прямо перед носом.</p>
      </li>
    </ul>

    <h4>Основные правила и награды на финише</h4>
    <ul className="compactList flightRules">
      <li><span>Минимум сытости</span><strong>10 единиц</strong></li>
      <li><span>Награды за полёт</span><strong>Монеты, XP и дроп капсул (при свободном слоте)</strong></li>
      <li><span>Платное предложение на финише</span><strong>Может появиться за Stars или GRAM</strong></li>
      <li><span>Бонус фарма</span><strong>Дополнительные монеты от экипировки и лиги</strong></li>
    </ul>
  </div>;
}
