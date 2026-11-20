import { DetailLink } from '../ui/DetailLink';
import { CapsulePrices } from './CapsulePrices';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import xp from '../../public/data/xp_levels.json';
import { chanceLabel, coinReward, duration, getTierName, notOdds, tiers, xpReward } from '../domain/mechanics';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { Price } from './Price';
import { GramEstimate } from './GamePrice';
import { useGuideLocale } from './guideLocale';

const capsuleNames = ['Obsidian', 'Moonlight Silver', 'Golden'];
const eggChancesRu = ['3% (≈ 1 из 33)', '4,5% (≈ 1 из 22)', '15% (≈ 1 из 7)'];
const eggChancesEn = ['3% (≈ 1 in 33)', '4.5% (≈ 1 in 22)', '15% (≈ 1 in 7)'];
const stickerChances = ['30%', '45%', '100%'];

export function CapsulePage() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const eggChances = en ? eggChancesEn : eggChancesRu;
  const { hash, pathname, state } = useLocation();
  const currentTier = tiers.find(tier => pathname === '/capsules/' + tier || hash === '#' + tier);
  if (!currentTier) return <>
    <p className="intro">{en ? 'Choose a capsule to view its rewards and opening price.' : 'Выбери капсулу, чтобы посмотреть её награды и цену открытия.'}</p>
    <section className="card leanList capsuleList">
      {tiers.map((tier, index) => <DetailLink className="mediaRow capsuleChoice" key={tier} to={'/capsules/' + tier}>
        <GameArt path={`/game/capsules/${tier}.webp`} size={46}/>
        <span><strong>{getTierName(tier, en)}</strong><small>{en ? `Egg chance · ${eggChances[index]}` : `Шанс яйца · ${eggChances[index]}`}</small></span>
        <span className="rowEnd"><b>{duration[tier] / 3_600_000} {en ? 'h' : 'ч'}</b><span className="rowChevron" aria-hidden="true"/></span>
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
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const numLocale = en ? 'en-US' : 'ru-RU';
  const eggChances = en ? eggChancesEn : eggChancesRu;
  const index = tiers.indexOf(currentTier);
  const hours = duration[currentTier] / 3_600_000;
  const [level, setLevel] = useState('');

  const capsuleLevel = Math.min(xp.length - 1, Math.max(1, Number(level) || 1));
  const odds = notOdds(currentTier, capsuleLevel);
  return <>
    <nav className="choiceBar profileTabs capsuleTabs" aria-label={en ? 'Capsule tier' : 'Тип капсулы'}>
      {tiers.map(tier => <Link key={tier} replace state={keepParent ? { guideDetail: true } : undefined} aria-current={tier === currentTier ? 'page' : undefined} to={'/capsules/' + tier}><GameArt path={`/game/capsules/${tier}.webp`} size={18}/>{getTierName(tier, en)}</Link>)}
    </nav>
    <div className="card mediaHeading capsuleHeading guideReward"><GameArt path={`/game/capsules/${currentTier}.webp`} size={58}/><div>
      <h2>{getTierName(currentTier, en)} {en ? 'capsule' : 'капсула'}</h2><p>{capsuleNames[index]} · {en ? `free after ${hours} h` : `бесплатно через ${hours} ч`}</p>
    </div></div>
    <CapsulePrices key={currentTier} tier={currentTier}/>
    <details className="card mediaDetails guideDisclosure">
      <summary><GameArt path="/game/ui/coin.webp" size={36}/>
        <span><strong>{en ? 'Guaranteed rewards' : 'Гарантированные награды'}</strong><small>{en ? 'Coins and XP by capsule level' : 'Монеты и опыт по уровню капсулы'}</small></span>
      </summary>
      <label className="field">{en ? 'Capsule level' : 'Уровень капсулы'} <input type="number" min="1" max={xp.length - 1} value={level} placeholder="1" inputMode="numeric" onChange={event => setLevel(event.target.value.replace(/\D/g, '').slice(0, 3))} /></label>
      <div className="stats"><span>{en ? 'XP' : 'Опыт'}<b>{xpReward(capsuleLevel,currentTier,xp).toLocaleString(numLocale)} XP</b></span><span><span className="currencyInline"><GameArt path="/game/items/wise-coin.webp" size={17}/> {en ? 'Coins' : 'Монеты'}</span><b>{coinReward(capsuleLevel,currentTier).toLocaleString(numLocale)}</b></span></div>
      <p className="caption">{en ? 'When the chiller door is open, capsules grant no XP.' : 'Если открыт чиллер, XP не начисляется.'}</p>
    </details>
    <section className="card">
      <h2>{en ? 'Bonus rewards' : 'Дополнительные награды'}</h2>
      <div className="mediaRow"><GameArt path="/game/items/egg.webp" size={40}/><DetailLink className="textLink" to="/owl/mystery">{en ? 'Mystery egg' : 'Загадочное яйцо'}</DetailLink><strong>{eggChances[index]}</strong></div>
      <div className="mediaRow"><GameArt path="/game/items/sticker-pack.webp" size={40}/><DetailLink className="textLink" to="/collections">{en ? 'Sticker pack' : 'Набор стикеров'}</DetailLink><strong>{stickerChances[index]}</strong></div>
    </section>
    <section className="card notDrop">
      <div className="mediaHeading notDropHeader">
        <GameArt path="/brand/tokens/not.webp" size={38}/>
        <div>
          <h2>{en ? 'Notcoin ($NOT) odds' : 'Шансы на Notcoin ($NOT)'}</h2>
          <p>{en ? 'The level is shown on the capsule card in-game' : 'Уровень указан на карточке капсулы в игре'}</p>
        </div>
      </div>
      <label className="field">{en ? 'Capsule level' : 'Уровень капсулы'}
        <input inputMode="numeric" value={level} placeholder="1" maxLength={3}
          onChange={event => setLevel(event.target.value.replace(/\D/g, '').slice(0, 3))}/>
      </label>
      <div className="bonusBreakdown"><span>{en ? 'Chance for any $NOT reward' : 'Шанс на любую сумму $NOT'}</span>
        <strong>{chanceLabel(Math.min(100, odds.reduce((total, row) => total + row.chance, 0)), en)}</strong>
      </div>
      <ul className="compactList oddsList">
        {odds.map(row => <li className="mediaRow" key={row.amount}>
          <span>{row.amount.toLocaleString(numLocale)} $NOT</span><strong>{chanceLabel(row.chance, en)}</strong>
        </li>)}
      </ul>
      <p className="caption">{en ? 'Each level adds 1% to the base chance multiplier. The game rolls the largest rewards first.' : 'Каждый уровень прибавляет 1% к множителю базового шанса. При расчёте игра сначала учитывает самые крупные награды.'}</p>
    </section>
  </>;
}

function SlotGuide() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const slots = [...Array.from({ length: 8 }, (_, index) => ({
    number: index + 4, level: (index + 1) * 10, stars: 500 * 2 ** index,
  })), { number: 12, level: null, stars: 200 }];

  return <section className="card">
    <h2>{en ? 'Capsule slots' : 'Слоты капсул'}</h2>
    <p>{en
      ? 'The first three slots are available from the start. Slots 4 through 11 unlock in order by level or payment. Slot 12 can be purchased at any level.'
      : 'Первые три слота доступны сразу. Слоты с 4-го по 11-й открываются по очереди за уровень или оплату. Слот 12 можно купить на любом уровне.'}</p>
    <details className="mediaDetails slotGuide" id="capsule-slots">
      <summary><GameGlyph name="lock"/><strong>{en ? 'Levels and prices' : 'Уровни и цены'}</strong></summary>
      <table className="priceTable slotTable">
        <thead><tr><th scope="col">{en ? 'Slot' : 'Слот'}</th><th scope="col">{en ? 'Level' : 'Уровень'}</th><th scope="col">Stars</th><th scope="col">GRAM</th></tr></thead>
        <tbody>{slots.map(({ number, level, stars }) => <tr key={number}>
          <th scope="row">{number}</th><td>{level ?? '—'}</td>
          <td><Price value={stars} currency="stars"/></td>
          <td><GramEstimate stars={stars} showUnavailable/></td>
        </tr>)}</tbody>
      </table>
      <p className="caption">{en ? 'Estimates update with the GRAM rate. The exact amount is shown in-game before payment.' : 'Оценка обновляется с курсом GRAM. Точную сумму показывает игра перед оплатой.'}</p>
    </details>
  </section>;
}

function CapsuleDropGuide() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  return <section className="card">
    <h2>{en ? 'How to get a capsule' : 'Как получить капсулу'}</h2>
    <p>{en ? 'A capsule can drop after winning a ranked battle or finishing a flight. Keep at least one slot open.' : 'Капсула может выпасть за победу в рейтинговом бою или на финише полёта. Оставь хотя бы один свободный слот.'}</p>
    <p>{en ? 'Flight rewards may also include a paid offer for Stars or GRAM.' : 'В наградах за полёт также может появиться предложение за Stars или GRAM.'}</p>
  </section>;
}
