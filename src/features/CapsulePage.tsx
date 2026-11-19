import { CapsulePrices } from './CapsulePrices';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import xp from '../../public/data/xp_levels.json';
import { chanceLabel, coinReward, duration, notOdds, tierNames, tiers, xpReward } from '../domain/mechanics';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { artSrc } from '../ui/warmArt';
import { SkinFarmCalculator } from './SkinFarmCalculator';

const capsuleNames = ['Obsidian', 'Moonlight Silver', 'Golden'];
const eggChances = ['3% (≈ 1 из 33)', '4,5% (≈ 1 из 22)', '15% (≈ 1 из 7)'];
const stickerChances = ['30%', '45%', '100%'];

export function CapsulePage() {
  const { hash, pathname } = useLocation();
  const currentTier = tiers.find(tier => pathname === '/capsules/' + tier || hash === '#' + tier);
  if (!currentTier) return <>
    <p className="intro">Выбери капсулу, чтобы посмотреть её награды и цену открытия.</p>
    <section className="card leanList capsuleList">
      {tiers.map((tier, index) => <Link className="mediaRow capsuleChoice" key={tier} to={'/capsules/' + tier}>
        <CapsuleSlot tier={tier}/>
        <span><strong>{tierNames[tier]}</strong><small>Шанс яйца · {eggChances[index]}</small></span>
        <span className="rowEnd"><b>{duration[tier] / 3_600_000} ч</b><span className="rowChevron" aria-hidden="true"/></span>
      </Link>)}
    </section>
    <CapsuleDropGuide/>
    <SlotGuide/>
  </>;
  return <>
    <CapsuleDetail tier={currentTier}/>
  </>;
}

function CapsuleDetail({ tier: currentTier }: { tier: typeof tiers[number] }) {
  const index = tiers.indexOf(currentTier);
  const hours = duration[currentTier] / 3_600_000;
  const [level, setLevel] = useState('');

  const capsuleLevel = Math.min(xp.length - 1, Math.max(1, Number(level) || 1));
  const odds = notOdds(currentTier, capsuleLevel);
  return <>
    <nav className="choiceBar profileTabs capsuleTabs" aria-label="Тип капсулы">
      {tiers.map(tier => <Link key={tier} aria-current={tier === currentTier ? 'page' : undefined} to={'/capsules/' + tier}><GameArt path={`/game/capsules/${tier}.webp`} size={18}/>{tierNames[tier]}</Link>)}
    </nav>
    <div className="card mediaHeading capsuleHeading"><CapsuleSlot tier={currentTier}/><div>
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
      <div className="mediaRow"><GameArt path="/game/items/egg.webp" size={40}/><Link className="textLink" to="/owl/mystery">Загадочное яйцо</Link><strong>{eggChances[index]}</strong></div>
      <div className="mediaRow"><GameArt path="/game/items/sticker-pack.webp" size={40}/><Link className="textLink" to="/collections">Набор стикеров</Link><strong>{stickerChances[index]}</strong></div>
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
            <small>Дополнительные монеты в боях и полётах</small>
          </span>
        </summary>
        <SkinFarmCalculator showTitle={false} />
      </details>
      <Link className="textLink" to="/owl/skins">Как работают скины и жетоны</Link>
    </section>
  </>;
}

function CapsuleSlot({ tier }: { tier: typeof tiers[number] }) {
  const background = artSrc('/game/ui/capsule-slot.webp');
  return <span className="capsuleSlot" style={{ backgroundImage: `url("${background}")` }}>
    <GameArt path={`/game/capsules/${tier}.webp`} size={43}/>
  </span>;
}

function SlotGuide() {
  return <section className="card"><h2>Как открыть больше слотов</h2>
      <p>Первые три слота доступны сразу. Слоты 4–11 открываются за уровень или Stars. Слот 12 открывается за 200 ⭐.</p>
      <details><summary><GameGlyph name="lock"/> Требования к каждому слоту</summary>
        {Array.from({length:8}, (_,i) => <div className="mediaRow" key={i}><span>Слот {i+4}</span><strong>{(i+1)*10} ур. или {(500*2**i).toLocaleString('ru-RU')} ⭐</strong></div>)}
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
