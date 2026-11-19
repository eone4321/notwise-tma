import { CapsulePrices } from './CapsulePrices';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import xp from '../../public/data/xp_levels.json';
import { chanceLabel, coinReward, duration, notOdds, tierNames, tiers, xpReward } from '../domain/mechanics';
import { GameArt } from '../ui/GameArt';
import { SkinFarmCalculator } from './SkinFarmCalculator';

const capsuleNames = ['Obsidian', 'Moonlight Silver', 'Golden'];
const eggChances = ['3% (≈ 1 из 33)', '4,5% (≈ 1 из 22)', '15% (≈ 1 из 7)'];
const stickerChances = ['30%', '45%', '100%'];

export function CapsulePage() {
  const { hash, pathname } = useLocation();
  const currentTier = tiers.find(tier => pathname === '/capsules/' + tier || hash === '#' + tier);
  if (!currentTier) return <>
    <p className="intro">Капсулы выпадают при победе в рейтинговом бою (PvP) и при успешном завершении полёта, если свободен хотя бы один слот под капсулу.</p>
    <section className="card leanList capsuleList">
      {tiers.map((tier, index) => <Link className="mediaRow capsuleChoice" key={tier} to={'/capsules/' + tier}>
        <GameArt path={`/game/capsules/${tier}.webp`} size={46}/>
        <span><strong>{tierNames[tier]}</strong><small>Шанс яйца · {eggChances[index]}</small></span>
        <span className="rowEnd"><b>{duration[tier] / 3_600_000} ч</b><span className="rowChevron" aria-hidden="true"/></span>
      </Link>)}
    </section>
    <CapsuleDropGuide/>
    <SlotGuide/>
  </>;
  return <>
    <CapsuleDetail tier={currentTier}/>
    <CapsuleDropGuide/>
  </>;
}

function CapsuleDetail({ tier: currentTier }: { tier: typeof tiers[number] }) {
  const index = tiers.indexOf(currentTier);
  const hours = duration[currentTier] / 3_600_000;
  const [level, setLevel] = useState('');

  const capsuleLevel = Math.min(xp.length - 1, Math.max(1, Number(level) || 1));
  const odds = notOdds(currentTier, capsuleLevel);
  return <>
    <nav className="choiceBar capsuleTabs" aria-label="Тип капсулы">
      {tiers.map(tier => <Link key={tier} aria-current={tier === currentTier ? 'page' : undefined} to={'/capsules/' + tier}>{tierNames[tier]}</Link>)}
    </nav>
    <div className="card mediaHeading capsuleHeading"><GameArt path={`/game/capsules/${currentTier}.webp`} size={56}/><div>
      <h2>{tierNames[currentTier]} капсула</h2><p>{capsuleNames[index]} · бесплатно через {hours} ч</p>
    </div></div>
    <CapsulePrices key={currentTier} tier={currentTier}/>
    <details className="card mediaDetails guideDisclosure">
      <summary><GameArt path="/game/items/wise-coin.webp" size={36}/>
        <span><strong>Гарантированные награды</strong><small>Монеты и опыт по уровню капсулы</small></span>
      </summary>
      <label className="field">Уровень капсулы <input type="number" min="1" max={xp.length - 1} value={level} placeholder="1" inputMode="numeric" onChange={event => setLevel(event.target.value.replace(/\D/g, '').slice(0, 3))} /></label>
      <div className="stats"><span>Опыт<b>{xpReward(capsuleLevel,currentTier,xp).toLocaleString('ru-RU')} XP</b></span><span><span className="currencyInline"><GameArt path="/game/items/wise-coin.webp" size={17}/> Монеты</span><b>{coinReward(capsuleLevel,currentTier)}</b></span></div>
      <p className="caption">Если открыт чиллер, XP не начисляется.</p>
    </details>
    <section className="card">
      <h2>Дополнительные награды</h2>
      <div className="mediaRow"><GameArt path="/game/items/egg.webp" size={40}/><Link className="textLink" to="/owl/mystery">Загадочное яйцо</Link><strong>{eggChances[index]}</strong></div>
      <div className="mediaRow"><GameArt path="/game/albums/1.webp" size={40}/><Link className="textLink" to="/collections">Набор стикеров</Link><strong>{stickerChances[index]}</strong></div>
    </section>
    <section className="card notDrop">
      <div className="mediaHeading notDropHeader">
        <GameArt path="/brand/tokens/not.webp" size={38}/>
        <div>
          <h2>Шансы на Notcoin ($NOT)</h2>
          <p>Уровень указан на карточке капсулы в игре</p>
        </div>
      </div>
      <label className="field">Уровень капсулы
        <input inputMode="numeric" value={level} placeholder="1" maxLength={2}
          onChange={event => setLevel(event.target.value.replace(/\D/g, ''))}/>
      </label>
      <div className="bonusBreakdown"><span>Шанс на любую сумму $NOT</span>
        <strong>{chanceLabel(Math.min(100, odds.reduce((total, row) => total + row.chance, 0)))}</strong>
      </div>
      <ul className="compactList oddsList">
        {odds.map(row => <li className="mediaRow" key={row.amount}>
          <span>{row.amount.toLocaleString('ru-RU')} $NOT</span><strong>{chanceLabel(row.chance)}</strong>
        </li>)}
      </ul>
      <p className="caption">Каждый уровень капсулы добавляет 1% к множителю базовых шансов. Сначала учитываются крупные суммы. Если их шансы заполняют часть таблицы, частым наградам остаётся меньше места.</p>
      <details className="mediaDetails farmCalcDisclosure">
        <summary>
          <span>
            <strong>Калькулятор бонуса к фарму монет</strong>
            <small>Скины, кольца и лига Дополнительные монеты в боях и полётах</small>
          </span>
        </summary>
        <SkinFarmCalculator showTitle={false} showEffects={true} />
      </details>
      <Link className="textLink" to="/owl/skins">Как работают скины и жетоны</Link>
    </section>
  </>;
}

function SlotGuide() {
  return <section className="card"><h2>Как открыть больше слотов</h2>
      <p>Первые три слота доступны сразу. Слоты 4–11 открываются за уровень или Stars. Слот 12 открывается за 200 ⭐.</p>
      <details><summary>Требования к каждому слоту</summary>
        {Array.from({length:8}, (_,i) => <div className="mediaRow" key={i}><span>Слот {i+4}</span><strong>{(i+1)*10} ур. или {(500*2**i).toLocaleString('ru-RU')} ⭐</strong></div>)}
      </details>
    </section>;
}

function CapsuleDropGuide() {
  return <section className="card capsuleDropGuide">
    <h2>Откуда берутся и как выпадают капсулы</h2>
    <p className="caption">Два подтверждённых источника капсул в коде Not Wise: The Game</p>
    <ul className="capsuleRulesList">
      <li>
        <span className="ruleNumber">1</span>
        <div className="ruleContent">
          <strong>Свободный слот (Обязательное условие)</strong>
          <p>Капсула занимает слот, пока тикает таймер или пока её не откроют за Stars/GRAM. Если все слоты заняты — капсула <strong>не выпадет вовсе</strong> (железное правило <em>«No free slot — no capsule»</em>).</p>
        </div>
      </li>
      <li>
        <span className="ruleNumber">2</span>
        <div className="ruleContent">
          <strong>Победа в рейтинговом PvP (Бои)</strong>
          <p>При каждой победе в рейтинговом поединке есть шанс выбить капсулу. Точные шансы получить капсулу каждого вида игра не показывает. Поражения, ничьи и тренировки в Додзе капсул не приносят.</p>
        </div>
      </li>
      <li>
        <span className="ruleNumber">3</span>
        <div className="ruleContent">
          <strong>Полёты на ракетах (Flights)</strong>
          <p>Капсулы также выпадают на финише полёта (серверный ответ <code>/flights/{'{id}'}/finish</code> в массиве <code>items</code>). При наличии свободного слота капсула падает в слот и начинает обратный отсчёт. На финише может появиться отдельное предложение за Stars или GRAM.</p>
        </div>
      </li>
      <li>
        <span className="ruleNumber">4</span>
        <div className="ruleContent">
          <strong>Градация редкости и таймеры</strong>
          <p>
            🖤 <strong>Обсидиановая (4 ч / 100 ⭐)</strong> — базовая и самая частая капсула.<br/>
            🤍 <strong>Лунное серебро (8 ч / 500 ⭐)</strong> — редкая капсула с увеличенными наградами (базовый вес $NOT ×1,5).<br/>
            💛 <strong>Золотая (24 ч / 2500 ⭐)</strong> — главный трофей: максимум монет и опыта, гарантированный стикерпак (100%), 15% на Загадочное яйцо и базовый вес $NOT ×5.
          </p>
        </div>
      </li>
    </ul>
  </section>;
}
