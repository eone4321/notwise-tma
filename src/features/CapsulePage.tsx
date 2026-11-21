import { DetailLink } from '../ui/DetailLink';
import { CapsulePrices } from './CapsulePrices';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import xp from '../../public/data/xp_levels.json';
import { baseChance, chanceLabel, coinReward, duration, getTierName, notOdds, starPrice, tiers, xpReward } from '../domain/mechanics';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { Price } from './Price';
import { GramEstimate } from './GamePrice';
import { lightHaptic } from '../telegram/client';
import { useGuideLocale } from './guideLocale';

const capsuleNames = ['Obsidian', 'Moonlight Silver', 'Golden'];
const eggChancesRu = ['3% (≈ 1 из 33)', '4,5% (≈ 1 из 22)', '15% (≈ 1 из 7)'];
const eggChancesEn = ['3% (≈ 1 in 33)', '4.5% (≈ 1 in 22)', '15% (≈ 1 in 7)'];
const eggShortChances = ['3%', '4,5%', '15%'];
const eggShortChancesEn = ['3%', '4.5%', '15%'];
const stickerChances = ['30%', '45%', '100%'];
const capsuleLevelStorage = 'notwise.guide.capsule-level.v1';
const maxCapsuleLevel = xp.length - 1;
const quickCapsuleLevels = [1, 10, 20, 30, 50] as const;

function readCapsuleLevel(): string {
  try {
    const saved = sessionStorage.getItem(capsuleLevelStorage);
    if (saved && /^\d{1,2}$/.test(saved) && Number(saved) >= 1 && Number(saved) <= maxCapsuleLevel) return saved;
  } catch { /* Optional. */ }
  return '1';
}

function writeCapsuleLevel(value: string) {
  try {
    if (value) sessionStorage.setItem(capsuleLevelStorage, value);
    else sessionStorage.removeItem(capsuleLevelStorage);
  } catch { /* Optional. */ }
}

export function CapsulePage() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const numLocale = en ? 'en-US' : 'ru-RU';
  const eggShort = en ? eggShortChancesEn : eggShortChances;
  const { hash, pathname, state } = useLocation();
  const currentTier = tiers.find(tier => pathname === '/capsules/' + tier || hash === '#' + tier);
  if (!currentTier) return <>
    <p className="intro">{en ? 'Pick a capsule to compare rewards, $NOT odds, and instant-open cost.' : 'Выбери капсулу, чтобы посмотреть награды, шансы на $NOT и цену открытия.'}</p>
    <section className="card leanList capsuleList">
      {tiers.map((tier, index) => <DetailLink className="mediaRow capsuleChoice" key={tier} to={'/capsules/' + tier}>
        <GameArt path={`/game/capsules/${tier}.webp`} size={46}/>
        <span>
          <strong>{tier === 'silver' ? (en ? 'Moonlight Silver Capsule' : 'Капсула лунного серебра') : getTierName(tier, en)}</strong>
          <small>
            {en
              ? `Egg ${eggShort[index]} · Stickers ${stickerChances[index]} · $NOT\u00A0×${baseChance[tier]}`
              : `Яйцо ${eggShort[index]} · Стикеры ${stickerChances[index]} · $NOT\u00A0×${baseChance[tier].toLocaleString(numLocale)}`}
            <br/>
            {en
              ? `Instant open up to ${starPrice[tier].toLocaleString(numLocale)}\u00A0⭐`
              : `Мгновенное открытие до ${starPrice[tier].toLocaleString(numLocale)}\u00A0⭐`}
          </small>
        </span>
        <span className="rowEnd"><b>{duration[tier] / 3_600_000}{en ? ' h' : 'ч'}</b><span className="rowChevron" aria-hidden="true"/></span>
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
  const [levelInput, setLevelInput] = useState(readCapsuleLevel);

  const capsuleLevel = Math.min(maxCapsuleLevel, Math.max(1, Number(levelInput) || 1));
  const setLevel = (next: number | string) => {
    const clean = typeof next === 'number'
      ? String(Math.min(maxCapsuleLevel, Math.max(1, next)))
      : next.replace(/\D/g, '').slice(0, 2);
    const bounded = clean && Number(clean) > maxCapsuleLevel ? String(maxCapsuleLevel) : clean;
    setLevelInput(bounded);
    writeCapsuleLevel(bounded || '1');
  };

  const odds = notOdds(currentTier, capsuleLevel);
  const anyNotChance = Math.min(100, odds.reduce((total, row) => total + row.chance, 0));

  return <>
    <nav className="choiceBar profileTabs capsuleTabs" aria-label={en ? 'Capsule tier' : 'Тип капсулы'}>
      {tiers.map(tier => <Link key={tier} replace state={keepParent ? { guideDetail: true } : undefined} aria-current={tier === currentTier ? 'page' : undefined} to={'/capsules/' + tier}><GameArt path={`/game/capsules/${tier}.webp`} size={18}/>{getTierName(tier, en)}</Link>)}
    </nav>
    <div className="card mediaHeading capsuleHeading guideReward"><GameArt path={`/game/capsules/${currentTier}.webp`} size={58}/><div>
      <h2>{currentTier === 'silver' ? (en ? 'Moonlight Silver Capsule' : 'Капсула лунного серебра') : `${getTierName(currentTier, en)} ${en ? 'capsule' : 'капсула'}`}</h2><p>{capsuleNames[index]} · {en ? `free after ${hours}\u00A0h` : `бесплатно через ${hours}\u00A0ч`}</p>
    </div></div>

    <section className="card capsuleRewardsCard">
      <div className="capsuleLevelBar">
        <div className="capsuleLevelLabel">
          <strong>{en ? 'Capsule level' : 'Уровень капсулы'}</strong>
          <small>{en ? 'Shown on the capsule card in-game' : 'Указан на карточке капсулы в игре'}</small>
        </div>
        <div className="buildStatStep capsuleLevelStepper">
          <button
            type="button"
            aria-label={en ? 'Decrease capsule level' : 'Уменьшить уровень капсулы'}
            disabled={capsuleLevel <= 1}
            onClick={() => { lightHaptic(); setLevel(capsuleLevel - 1); }}
          >−</button>
          <input
            type="text"
            inputMode="numeric"
            aria-label={en ? 'Capsule level' : 'Уровень капсулы'}
            value={levelInput}
            placeholder="1"
            onChange={event => setLevel(event.target.value)}
            onBlur={() => { if (!levelInput || Number(levelInput) < 1) setLevel(1); }}
          />
          <button
            type="button"
            aria-label={en ? 'Increase capsule level' : 'Увеличить уровень капсулы'}
            disabled={capsuleLevel >= maxCapsuleLevel}
            onClick={() => { lightHaptic(); setLevel(capsuleLevel + 1); }}
          >+</button>
        </div>
      </div>

      <div className="capsuleQuickLevels" role="group" aria-label={en ? 'Quick capsule levels' : 'Быстрый выбор уровня'}>
        {quickCapsuleLevels.map(lvl => (
          <button
            key={lvl}
            type="button"
            aria-pressed={capsuleLevel === lvl}
            onClick={() => { lightHaptic(); setLevel(lvl); }}
          >
            {en ? `Lv. ${lvl}` : `${lvl} ур.`}
          </button>
        ))}
      </div>

      <div className="capsuleRewardGrid">
        <div className="capsuleRewardCell">
          <span className="capsuleRewardLabel">{en ? 'Experience' : 'Опыт'}</span>
          <strong>{xpReward(capsuleLevel, currentTier, xp).toLocaleString(numLocale)} XP</strong>
        </div>
        <div className="capsuleRewardCell">
          <span className="capsuleRewardLabel">
            <GameArt path="/game/items/wise-coin.webp" size={15}/>
            <span>{en ? 'Coins' : 'Монеты'}</span>
          </span>
          <strong>{coinReward(capsuleLevel, currentTier).toLocaleString(numLocale)}</strong>
        </div>
        <DetailLink className="capsuleRewardCell isLink" to="/owl/mystery">
          <span className="capsuleRewardLabel">
            <GameArt path="/game/items/egg.webp" size={16}/>
            <span>{en ? 'Mystery egg' : 'Яйцо'}</span>
          </span>
          <strong><span>{eggChances[index]}</span><span className="rowChevron" aria-hidden="true"/></strong>
        </DetailLink>
        <DetailLink className="capsuleRewardCell isLink" to="/collections">
          <span className="capsuleRewardLabel">
            <GameArt path="/game/items/sticker-pack.webp" size={16}/>
            <span>{en ? 'Sticker pack' : 'Стикеры'}</span>
          </span>
          <strong><span>{stickerChances[index]}</span><span className="rowChevron" aria-hidden="true"/></strong>
        </DetailLink>
      </div>
      <p className="caption capsuleChillerNote">
        {en ? 'With an open Chiller, XP is frozen while coins, items, and $NOT stay intact.' : 'С открытым Чиллером опыт не начисляется, но монеты, предметы и $NOT выпадают как обычно.'}
      </p>
    </section>

    <CapsulePrices key={currentTier} tier={currentTier}/>

    <section className="card notDrop">
      <div className="mediaHeading notDropHeader">
        <GameArt path="/brand/tokens/not.webp" size={38}/>
        <div>
          <h2>{en ? 'Notcoin ($NOT) odds' : 'Шансы на Notcoin ($NOT)'}</h2>
          <p>{en ? `For level ${capsuleLevel} (+${capsuleLevel}% to base odds)` : `Для ${capsuleLevel}-го уровня (+${capsuleLevel}% к базовому шансу)`}</p>
        </div>
      </div>
      <div className="bonusBreakdown"><span>{en ? 'Chance for any $NOT reward' : 'Шанс на любую сумму $NOT'}</span>
        <strong>{chanceLabel(anyNotChance, en)}</strong>
      </div>
      <ul className="compactList oddsList">
        {odds.map(row => <li className="mediaRow" key={row.amount}>
          <span>{row.amount.toLocaleString(numLocale)} $NOT{row.amount > 10_000 && <small className="capsuleCapTag">{en ? 'Pays out 10,000 $NOT' : 'Выплата 10 000 $NOT'}</small>}</span><strong>{chanceLabel(row.chance, en)}</strong>
        </li>)}
      </ul>
      <div className="memoNote" style={{ marginTop: 10 }}>
        <p>
          {en
            ? 'Single-drop cap is 10,000 $NOT (higher table tiers pay out 10,000). Largest tiers roll first, and each capsule level adds +1% to the base multiplier.'
            : 'Лимит одной награды — 10 000 $NOT (более крупные строки таблицы начисляются как 10 000). Игра проверяет крупные суммы сверху вниз, а каждый уровень добавляет +1% к множителю.'}
        </p>
      </div>
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
      ? 'Slots 1–3 are open from the start. Slots 4–11 unlock by level or Stars, and slot 12 can be bought at any level for 200 ⭐.'
      : 'Слоты 1–3 открыты сразу. Слоты 4–11 открываются по уровню или за Stars, а 12-й можно купить на любом уровне за 200 ⭐.'}</p>
    <details className="mediaDetails slotGuide" id="capsule-slots">
      <summary><GameGlyph name="lock"/><strong>{en ? 'Levels and prices' : 'Уровни и цены'}</strong></summary>
      <div className="memoTableWrap">
        <table className="priceTable slotTable">
          <thead><tr><th scope="col">{en ? 'Slot' : 'Слот'}</th><th scope="col">{en ? 'Level' : 'Уровень'}</th><th scope="col">Stars</th><th scope="col">GRAM</th></tr></thead>
          <tbody>{slots.map(({ number, level, stars }) => <tr key={number}>
            <th scope="row">{number}</th><td>{level ?? '—'}</td>
            <td><Price value={stars} currency="stars"/></td>
            <td><GramEstimate stars={stars} showUnavailable/></td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="caption">{en ? 'GRAM estimate updates with the live rate; the exact amount is shown before payment.' : 'Оценка в GRAM обновляется по курсу; точную сумму игра показывает перед оплатой.'}</p>
    </details>
  </section>;
}

function CapsuleDropGuide() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  return <section className="card capsuleDropCard">
    <h2>{en ? 'How to get a capsule' : 'Как получить капсулу'}</h2>
    <p>{en
      ? 'Drops after ranked battle wins or flight finishes while you have a free slot (paid offers may also appear after flights).'
      : 'Выпадает за победу в рейтинговом бою или на финише полёта, если есть свободный слот (после полёта также бывает платное предложение).'}</p>
    <p>{en
      ? 'An open Chiller freezes only capsule XP — coins, items, and $NOT still drop as usual.'
      : 'Открытый Чиллер замораживает только XP — монеты, предметы и $NOT из капсул выпадают как обычно.'}</p>
  </section>;
}
