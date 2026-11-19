import { DetailLink } from '../ui/DetailLink';
import { CapsulePrices } from './CapsulePrices';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import xp from '../../public/data/xp_levels.json';
import { chanceLabel, coinReward, duration, notOdds, tierNames, tiers, xpReward } from '../domain/mechanics';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { Price } from './Price';
import { GramEstimate } from './GamePrice';

const capsuleNames = ['Obsidian', 'Moonlight Silver', 'Golden'];
const eggChances = ['3% (≈ 1 из 33)', '4,5% (≈ 1 из 22)', '15% (≈ 1 из 7)'];
const stickerChances = ['30%', '45%', '100%'];

export function CapsulePage() {
  const { hash, pathname, state } = useLocation();
  const currentTier = tiers.find(tier => pathname === '/capsules/' + tier || hash === '#' + tier);
  if (!currentTier) return <>
    <p className="intro">Выбери капсулу, чтобы посмотреть её награды и цену открытия.</p>
    <section className="card leanList capsuleList">
      {tiers.map((tier, index) => <DetailLink className="mediaRow capsuleChoice" key={tier} to={'/capsules/' + tier}>
        <GameArt path={`/game/capsules/${tier}.webp`} size={46}/>
        <span><strong>{tierNames[tier]}</strong><small>Шанс яйца · {eggChances[index]}</small></span>
        <span className="rowEnd"><b>{duration[tier] / 3_600_000} ч</b><span className="rowChevron" aria-hidden="true"/></span>
      </DetailLink>)}
    </section>
    <CapsuleDropGuide/>
    <SlotGuide/>
  </>;
  return <>
    <CapsuleDetail tier={currentTier} keepParent={state?.guideDetail === true}/>
  </>;
}

function CapsuleDetail({ tier: currentTier, keepParent }: { tier: typeof tiers[number]; keepParent: boolean }) {
  const index = tiers.indexOf(currentTier);
  const hours = duration[currentTier] / 3_600_000;
  const [level, setLevel] = useState('');

  const capsuleLevel = Math.min(xp.length - 1, Math.max(1, Number(level) || 1));
  const odds = notOdds(currentTier, capsuleLevel);
  return <>
    <nav className="choiceBar profileTabs capsuleTabs" aria-label="Тип капсулы">
      {tiers.map(tier => <Link key={tier} replace state={keepParent ? { guideDetail: true } : undefined} aria-current={tier === currentTier ? 'page' : undefined} to={'/capsules/' + tier}><GameArt path={`/game/capsules/${tier}.webp`} size={18}/>{tierNames[tier]}</Link>)}
    </nav>
    <div className="card mediaHeading capsuleHeading guideReward"><GameArt path={`/game/capsules/${currentTier}.webp`} size={58}/><div>
      <h2>{tierNames[currentTier]} капсула</h2><p>{capsuleNames[index]} · бесплатно через {hours} ч</p>
    </div></div>
    <CapsulePrices key={currentTier} tier={currentTier}/>
    <details className="card mediaDetails guideDisclosure">
      <summary><GameArt path="/game/ui/coin.webp" size={36}/>
        <span><strong>Гарантированные награды</strong><small>Монеты и опыт по уровню капсулы</small></span>
      </summary>
      <label className="field">Уровень капсулы <input type="number" min="1" max={xp.length - 1} value={level} placeholder="1" inputMode="numeric" onChange={event => setLevel(event.target.value.replace(/\D/g, '').slice(0, 3))} /></label>
      <div className="stats"><span>Опыт<b>{xpReward(capsuleLevel,currentTier,xp).toLocaleString('ru-RU')} XP</b></span><span><span className="currencyInline"><GameArt path="/game/items/wise-coin.webp" size={17}/> Монеты</span><b>{coinReward(capsuleLevel,currentTier)}</b></span></div>
      <p className="caption">Если открыт чиллер, XP не начисляется.</p>
    </details>
    <section className="card">
      <h2>Дополнительные награды</h2>
      <div className="mediaRow"><GameArt path="/game/items/egg.webp" size={40}/><DetailLink className="textLink" to="/owl/mystery">Загадочное яйцо</DetailLink><strong>{eggChances[index]}</strong></div>
      <div className="mediaRow"><GameArt path="/game/items/sticker-pack.webp" size={40}/><DetailLink className="textLink" to="/collections">Набор стикеров</DetailLink><strong>{stickerChances[index]}</strong></div>
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
      <p className="caption">Каждый уровень прибавляет 1% к множителю базового шанса. При расчёте игра сначала учитывает самые крупные награды.</p>
    </section>
  </>;
}

function SlotGuide() {
  const slots = [...Array.from({ length: 8 }, (_, index) => ({
    number: index + 4, level: (index + 1) * 10, stars: 500 * 2 ** index,
  })), { number: 12, level: null, stars: 200 }];

  return <section className="card">
    <h2>Слоты капсул</h2>
    <p>Первые три слота доступны сразу. Слоты с 4-го по 11-й открываются по очереди за уровень или оплату. Слот 12 можно купить на любом уровне.</p>
    <details className="mediaDetails slotGuide" id="capsule-slots">
      <summary><GameGlyph name="lock"/><strong>Уровни и цены</strong></summary>
      <table className="priceTable slotTable">
        <thead><tr><th scope="col">Слот</th><th scope="col">Уровень</th><th scope="col">Stars</th><th scope="col">GRAM</th></tr></thead>
        <tbody>{slots.map(({ number, level, stars }) => <tr key={number}>
          <th scope="row">{number}</th><td>{level ?? '—'}</td>
          <td><Price value={stars} currency="stars"/></td>
          <td><GramEstimate stars={stars} showUnavailable/></td>
        </tr>)}</tbody>
      </table>
      <p className="caption">Оценка по 0,015 $ за Star и курсу GRAM. Точную сумму показывает игра перед оплатой.</p>
    </details>
  </section>;
}

function CapsuleDropGuide() {
  return <section className="card">
    <h2>Как получить капсулу</h2>
    <p>Капсула может выпасть за победу в рейтинговом бою или на финише полёта. Оставь хотя бы один свободный слот.</p>
    <p>В наградах за полёт также может появиться предложение за Stars или GRAM.</p>
  </section>;
}
