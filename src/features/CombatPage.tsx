import { DetailLink } from '../ui/DetailLink';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import skills from '../../public/data/skills.json';
import progression from './owl-progression.json';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { GameSymbol } from '../ui/GameSymbol';
import { GameArt } from '../ui/GameArt';
import { skillCopy } from './skill-copy';
import skillLevels from './skill-levels.json';
import { BattleReadout, skillEffect } from './BattleReadout';
import { battleLeagues } from './battle-leagues';
import { battleStats, skillHpMultiplier, skillCooldown, skillMana, startingAttribute } from '../domain/combat';
import { BuildConstructor } from './BuildConstructor';

export function SpBadge({ value }: { value?: number | string }) {
  return <span className="spBadge">
    {value !== undefined && <span className="spValue">{typeof value === 'number' ? value.toLocaleString('ru-RU') : value}</span>}
    <GameSymbol name="sp" size={14}/>
  </span>;
}

const branches = [
  ['wisdom', 'Мудрость', 'Критический удар и мана'],
  ['strength', 'Сила', 'Урон по противнику'],
  ['agility', 'Ловкость', 'Уклонение и контроль'],
  ['endurance', 'Выносливость', 'Здоровье и защита'],
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
  const { pathname, search, state } = useLocation();
  const [, , page, branchId, skillId] = pathname.split('/');
  const searchParams = new URLSearchParams(search);
  const tab = searchParams.get('tab');
  const isBuilds = page === 'builds' || (!page && (tab === 'builds' || tab === 'build' || state?.tab === 'builds'));
  const isStats = page === 'stats' && !isBuilds;
  const isSkills = !page && !isBuilds && !isStats;
  const branch = !isBuilds && branches.find(item => item[0] === branchId);
  const skill = !isBuilds && skills.find(item => item.id === Number(skillId) && item.branch === branchId);
  return <>
    {!branch && <nav className="choiceBar profileTabs combatTabs" aria-label="Раздел боя">
      <Link to="/combat" replace aria-current={isSkills ? 'page' : undefined}><GameGlyph name="lightning"/>Навыки</Link>
      <Link to="/combat/stats" replace aria-current={isStats ? 'page' : undefined}><GameGlyph name="shield"/>Характеристики</Link>
      <Link to="/combat/builds" replace aria-current={isBuilds ? 'page' : undefined}><GameGlyph name="sparkles"/>Билды</Link>
    </nav>}
    {isBuilds ? <BuildConstructor/> :
      skill ? <SkillDetail key={skill.id} skill={skill}/> :
      branch ? <>
        <h2 className="subTitle">{branch[1]}</h2>
        <section className="card skillShelf">
          <p className="caption">С уровня 2 вложи очко атрибута в эту ветку и открой навык за полученное очко ветки. Для улучшения навыков нужны <SpBadge/> из Додзе.</p>
          {skills.filter(item => item.branch === branch[0]).sort((a, b) => a.tier - b.tier).map(item => {
            const isPassive = item.type === 'passive';
            const cost = isPassive
              ? `Пассивный · ${skillMana(item.tier, true, item.id === 10)} маны`
              : `Активный · ${skillMana(item.tier, false)} маны · откат ${skillCooldown(item.tier)} с`;
            return <DetailLink to={'/combat/skills/' + branch[0] + '/' + item.id} className="mediaRow skillRow" key={item.id}>
              <span className="skillTile"><GameArt path={skillArt(item.id)} size={38}/><b aria-hidden="true">{item.tier}</b></span>
              <span><strong>{skillCopy[item.id - 1][0]}</strong><small>{cost}</small><small>{unlockCondition(item)}</small></span>
              <span className="rowChevron" aria-hidden="true"/>
            </DetailLink>;
          })}
        </section>
      </> : isStats ? <CombatStats/> : <>
        <p className="intro">Ветки навыков открываются на 2-м уровне. В бой можно взять до трёх навыков, прокачка — за <SpBadge/> из Додзе.</p>
        <div className="card combatBranches">
          {branches.map(([id, title, purpose]) =>
            <DetailLink className="mediaRow" to={'/combat/skills/' + id} key={id}>
              <GameAttribute name={id}/><span><strong>{title}</strong><small>{purpose}</small></span><span className="rowChevron" aria-hidden="true"/>
            </DetailLink>
          )}
        </div>
        <section className="card">
          <h2>Что важно знать перед боем</h2>
          <ul className="compactList combatTipsList">
            <li><strong>Мана конечна на весь бой</strong><span>В бою она не восстанавливается. При 0 маны отключаются не только активные, но и пассивные навыки (Мощный удар, Щит из скорлупы, Железная воля, Подсказка духа).</span></li>
            <li><strong>Серия из 3 попаданий подряд</strong><span>Три удара без блока и уклонения вызывают комбо из 4 доп. атак и оглушают цель на 1,5 с. Промах сбрасывает счётчик.</span></li>
            <li><strong>Максимум 35% HP за один удар</strong><span>Даже крит ×2 или «Двойная ставка» ×5 не снимут обычным ударом больше 35% максимального здоровья цели.</span></li>
            <li><strong>Оглушение не мешает блоку</strong><span>Оглушённая сова не бьёт, но всё ещё меняет зону блока. Зафиксировать блок могут только «Сковывающие цепи».</span></li>
            <li><strong>Что бьёт сквозь защиту</strong><span>«Молния» проходит и через блок, и через уклонение; «Астероид» — через блок. Удар в твой блок не тратит заряды «Уклонения».</span></li>
            <li><strong>Пауза 5-й ступени</strong><span>Ультимативные навыки после нажатия на 2 с блокируют твою атаку и смену блока — не жми их под чужой Фазовый сдвиг.</span></li>
            <li><strong>Потолок 70% для крита и уклонения</strong><span>Оба предела достигаются при 100 стата. Ловкость сверх 100 ничего не даёт, а Мудрость продолжает добавлять +20 маны за очко.</span></li>
          </ul>
        </section>
      </>}
  </>;
}

export function ModesPage() {
  const { hash } = useLocation();
  return <section className="card modesCard">
        {modes.map(([icon, title, when, description]) => <details className="mediaDetails" key={title}
          id={icon === 'rocket' ? 'flight' : undefined} open={icon === 'rocket' && hash === '#flight' || undefined}>
          <summary>{icon === 'swords' ? <GameArt path="/game/ui/fight-vs.png" size={36}/> : <GameSymbol name={icon}/>}<span><strong>{title}</strong>
            <small>{icon === 'rocket' ? <span className="energyBadge">С 5-го уровня · от 250 <GameSymbol name="bolt" size={13}/></span> :
              icon === 'boxing' ? <span className="energyBadge">Со 2-го уровня · 2 <GameSymbol name="bolt" size={13}/> / удар</span> : when}</small></span>
          </summary>
          {icon === 'rocket' ? <FlightDetails/> : <p>{description}</p>}
          {icon === 'swords' && <>
            <p>Целься в голову, корпус или живот. Блок соперника отменяет урон в выбранной зоне.</p>
            <p>В тренировке между атаками проходит 1,5 с, между сменами блока — 1 с.</p>
          </>}
          {icon === 'target' && <p>Ориентир расхода энергии — 20 на 5–9-м уровне, 30 на 10–14-м. Стоимость растёт на 10 каждые пять уровней, начиная с 10 энергии на уровнях 1–4.</p>}
        </details>)}
        <details className="mediaDetails"><summary><GameSymbol name="trophy"/><span><strong>Призы сезона</strong><small>Первые 100 мест</small></span></summary>
        <p>При фонде 1 млн $NOT первые три места получают 400 000, 350 000 и 250 000 $NOT соответственно.</p><p>Топ-10 получает золотое загадочное яйцо. Места 11–100 получают загадочное яйцо, которое продаётся за 100 Stars.</p>
        <p>Призы приходят автоматически. Фонд зависит от сезона.</p>
        <DetailLink className="textLink" to="/owl/season">Что выпадает из загадочного яйца</DetailLink>
      </details>
      <details className="mediaDetails" id="leagues" open={hash === "#leagues" || undefined}><summary><GameSymbol name="shield"/><span><strong>Боевые лиги</strong><small>Пороги рейтинга и бонус к фарму</small></span></summary>
        <table className="priceTable">
          <thead><tr><th scope="col">Лига</th><th scope="col">От MMR</th><th scope="col">Фарм</th></tr></thead>
          <tbody>{battleLeagues.map(([name, rating], index) => <tr key={name}>
            <th scope="row">{name}</th><td>{format.format(rating)}</td><td>+{index + 1}%</td>
          </tr>)}</tbody>
        </table>
      </details>
    </section>;
}

function SkillDetail({ skill }: { skill: Skill }) {
  const [level, setLevel] = useState(1);
  const [owlLevel, setOwlLevel] = useState(20);
  const [title, description] = skillCopy[skill.id - 1];
  const type = skillLevels[String(skill.id) as keyof typeof skillLevels].type;
  const scalesWithLevel = hpEffects.has(type);
  const multiplier = skillHpMultiplier(owlLevel);
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
      {skillEffect(skill.id, level, owlLevel).map(([label, value]) => <li className="mediaRow" key={label}><span>{label}</span><strong>{value}</strong></li>)}
      <li className="mediaRow"><span>{skill.type === 'active' ? 'Мана за применение' : 'Мана за срабатывание'}</span>
        <strong>{skillMana(skill.tier, skill.type === 'passive', type === 'reveal')}</strong></li>
      <li className="mediaRow"><span>Тренировка в Додзе</span><strong className="energyBadge">{skill.dojoEnergy} <GameSymbol name="bolt" size={15}/></strong></li>
      {skill.type === 'active' && <li className="mediaRow"><span>Перезарядка</span><strong>{skillCooldown(skill.tier)} с</strong></li>}
      <li className="mediaRow"><span>{level === 21 ? 'Прокачка' : `Улучшение до ${level + 1}-го уровня`}</span>
        <strong>{level === 21 ? 'Максимум' : <SpBadge value={format.format(100 * 2 ** (level - 1))}/>}</strong></li>
    </ul>
    {scalesWithLevel && <p className="caption">Множитель от уровня совы ×{precise.format(multiplier)}. Показан исходный эффект до защиты цели и других боевых модификаторов.</p>}
  </section>;
}

const attributes = [
  ['strength', 'Сила', '+0,065 урона за очко', 'Повышает урон обычных ударов.'],
  ['agility', 'Ловкость', '+0,7% к шансу уклонения за очко', 'Шанс складывается. Например, с 20% он вырастет до 20,7%. Предел — 70%.'],
  ['wisdom', 'Мудрость', '+0,7% к шансу крита и +20 маны за очко', 'Например, шанс крита 20% вырастет до 20,7%. Предел — 70%. Базовая мана — 200.'],
  ['endurance', 'Выносливость', '+2 HP за очко', 'К базовым 20 HP прибавляются 3 HP за каждый уровень совы и 2 HP за каждое очко выносливости.'],
] as const;

function CombatStats() {
  const [level, setLevel] = useState(0);
  const [owlLevel, setOwlLevel] = useState(2);
  const curve = progression.current;
  return <>
    <section className="card"><h2>Эффект одного очка атрибута</h2>
      {attributes.map(([icon, name, effect, detail]) => <details className="mediaDetails" key={name}>
        <summary><GameAttribute name={icon}/><span><strong>{name}</strong><small>{effect}</small></span></summary>
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
      <details><summary>Цена улучшений</summary>
        <p className="caption">Каждое улучшение можно прокачать до 21-го уровня. Первый шаг стоит 10 <SpBadge/>, каждый следующий вдвое дороже.</p>
        <label className="field">Текущий уровень улучшения
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
  const base = String(startingAttribute);
  const [input, setInput] = useState({ level: '20', strength: base, agility: base, wisdom: base, endurance: base });
  const stats = battleStats(Number(input.level), Number(input.strength), Number(input.agility), Number(input.wisdom), Number(input.endurance));

  return <details className="card mediaDetails calculator battleCalculator" id="battle-calculator">
    <summary><GameGlyph name="fight"/><span><strong>Боевой калькулятор</strong><small>Здоровье, мана и урон</small></span></summary>
    <p className="caption">Введи итоговые атрибуты из профиля совы. Как точка отсчёта в каждом поле стоит базовое значение 3.</p>
    <div className="calculatorGrid">
      {statInputs.map(([key, label]) => <label className="field" key={key}><span>{key !== 'level' && <GameAttribute name={key}/>} {label}</span>
        <input inputMode="numeric" value={input[key]} placeholder="0" maxLength={4}
          onChange={event => setInput({ ...input, [key]: event.target.value.replace(/\D/g, '') })}/>
      </label>)}
    </div>
    <BattleReadout stats={stats}/>
    <p className="caption">Обычный удар показан до округления, блока и других эффектов. Итог также зависит от действий соперника.</p>
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

    <h4>Что помогает в полёте</h4>
    <ul className="compactList flightItemsList">
      <li>
        <span className="flightItemHead"><GameSymbol name="rocket" size={20}/><strong>Ракета</strong></span>
        <p>Ускоряет, защищает от препятствий и умножает монеты. Три ракеты в день, ещё можно найти на трассе.</p>
      </li>
      <li>
        <span className="flightItemHead"><GameSymbol name="magnet" size={20}/><strong>Магнит (10 сек)</strong></span>
        <p>Притягивает монеты со всех трёх дорожек.</p>
      </li>
      <li>
        <span className="flightItemHead"><span className="emojiIcon">🍣</span><strong>Суши</strong></span>
        <p>Первые две суши отнимают по <strong>20% текущего счёта</strong>. Третья прибавляет <strong>20%</strong> к оставшимся монетам и открывает стикер <strong>Sushi Master</strong>.</p>
      </li>
    </ul>

    <h4>Ловушки на трассе</h4>
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
