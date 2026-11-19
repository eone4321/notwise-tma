import { skinExamples } from './SkinExamples';
import { CapsulePrices } from './CapsulePrices';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import xp from '../../public/data/xp_levels.json';
import { chanceLabel, coinReward, duration, notOdds, tierNames, tiers, xpReward } from '../domain/mechanics';
import { GameArt } from '../ui/GameArt';
import { SkinFarmCalculator, FarmInfoModal } from './SkinFarmCalculator';

const capsuleNames = ['Obsidian', 'Moonlight Silver', 'Golden'];
const eggChances = ['3% (≈ 1 из 33)', '4,5% (≈ 1 из 22)', '15% (≈ 1 из 7)'];
const stickerChances = ['30%', '45%', '100%'];

export function CapsulePage() {
  const { hash, pathname } = useLocation();
  const currentTier = tiers.find(tier => pathname === '/capsules/' + tier || hash === '#' + tier);
  if (!currentTier) return <>
    <p className="intro">Победа в рейтинговом бою может дать капсулу, если есть свободный слот.</p>
    <section className="card leanList capsuleList">
      {tiers.map((tier, index) => <Link className="mediaRow capsuleChoice" key={tier} to={'/capsules/' + tier}>
        <GameArt path={`/game/capsules/${tier}.webp`} size={46}/>
        <span><strong>{tierNames[tier]}</strong><small>Шанс яйца · {eggChances[index]}</small></span>
        <span className="rowEnd"><b>{duration[tier] / 3_600_000} ч</b><span className="rowChevron" aria-hidden="true"/></span>
      </Link>)}
    </section>
    <SlotGuide/>
  </>;
  return <CapsuleDetail tier={currentTier}/>;
}

function CapsuleDetail({ tier: currentTier }: { tier: typeof tiers[number] }) {
  const index = tiers.indexOf(currentTier);
  const hours = duration[currentTier] / 3_600_000;
  const [level, setLevel] = useState('');
  const [skinMode, setSkinMode] = useState<'none' | 'example' | 'custom'>('none');
  const [customTotalBonus, setCustomTotalBonus] = useState(5); // default 1 regular body part
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const totalBonus = skinMode === 'custom'
    ? customTotalBonus
    : skinMode === 'example'
    ? skinExamples[0].bonus
    : 0;

  const capsuleLevel = Math.min(xp.length - 1, Math.max(1, Number(level) || 1));
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
          <div className="headingWithAction">
            <h2>Шансы на Notcoin</h2>
            <button
              type="button"
              className="infoCircleBtn"
              onClick={() => setIsInfoOpen(true)}
              aria-label="Как рассчитываются шансы на Notcoin"
              title="Как работает бонус к фарму"
            >
              i
            </button>
          </div>
          <p>Учитывают бонус к дропу $NOT</p>
        </div>
      </div>
      <div className="choiceBar" aria-label="Скин">
        {([['none', 'Без скина'], ['example', 'Пример скина'], ['custom', 'Свои детали']] as const).map(([value, label]) =>
          <button key={value} aria-pressed={skinMode === value} onClick={() => setSkinMode(value)}>{label}</button>)}
      </div>
      {skinMode === 'example' && <div className="mediaRow notSkinExample">
        <GameArt path={`/game/skins/${skinExamples[0].id}.svg`} size={50}/>
        <div className="notSkinExampleText">
          <span>{skinExamples[0].features}</span>
          <strong className="exampleBonusBadge">+{skinExamples[0].bonus}% к фарму</strong>
        </div>
      </div>}
      {skinMode === 'custom' && (
        <SkinFarmCalculator
          onChange={total => setCustomTotalBonus(total)}
        />
      )}
      <div className="bonusBreakdown">
        <span>Бонус к дропу $NOT:</span>
        <strong>+{totalBonus.toLocaleString('ru-RU')}%{totalBonus > 0 ? ` (×${(1 + totalBonus / 100).toFixed(2)})` : ''}</strong>
      </div>
      <ul className="compactList oddsList">
        {notOdds(currentTier, totalBonus).map(row => <li className="mediaRow" key={row.amount}>
          <span>{row.amount.toLocaleString('ru-RU')} $NOT</span><strong>{chanceLabel(row.chance)}</strong>
        </li>)}
      </ul>
      <Link className="textLink" to="/owl/skins">Как работают скины и жетоны</Link>
    </section>
    <FarmInfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
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