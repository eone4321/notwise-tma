import { CapsulePrices } from './CapsulePrices';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import xp from '../../public/data/xp_levels.json';
import { chanceLabel, coinReward, duration, notOdds, tierNames, tiers, xpReward } from '../domain/mechanics';
import { GameArt } from '../ui/GameArt';

const capsuleNames = ['Obsidian', 'Moonlight Silver', 'Golden'];
const eggChances = ['3% (≈ 1 из 33)', '4,5% (≈ 1 из 22)', '15% (≈ 1 из 7)'];
const stickerChances = ['30%', '45%', '100%'];

export function CapsulePage() {
  const { hash, pathname } = useLocation();
  const currentTier = tiers.find(tier => pathname === '/capsules/' + tier || hash === '#' + tier);
  if (!currentTier) return <>
    <p className="intro">Победа в рейтинговом бою может дать капсулу, если есть свободный слот.</p>
    <div className="catalogGrid">{tiers.map((tier, index) =>
      <Link className="catalogTile" key={tier} to={'/capsules/' + tier}>
        <GameArt path={`/game/capsules/${tier}.webp`} size={50}/>
        <strong>{tierNames[tier]}</strong><small>{duration[tier] / 3_600_000} ч · яйцо {eggChances[index]}</small>
      </Link>
    )}</div>
    <SlotGuide/>
  </>;
  return <CapsuleDetail tier={currentTier}/>;
}

function CapsuleDetail({ tier: currentTier }: { tier: typeof tiers[number] }) {
  const index = tiers.indexOf(currentTier);
  const hours = duration[currentTier] / 3_600_000;
  const [level, setLevel] = useState(8);
  const [farm, setFarm] = useState(0);
  return <>
    <div className="card mediaHeading"><GameArt path={`/game/capsules/${currentTier}.webp`} size={56}/><div>
      <h2>{tierNames[currentTier]} капсула</h2><p>{capsuleNames[index]} · бесплатно через {hours} ч</p>
    </div></div>
    <CapsulePrices key={currentTier} tier={currentTier}/>
    <section className="card">
      <h3>Гарантированные награды</h3>
      <label className="field">Уровень капсулы <input type="number" min="1" max={xp.length - 1} value={level} onChange={event => setLevel(Math.min(xp.length - 1, Math.max(1, Math.trunc(Number(event.target.value)))))} /></label>
      <div className="stats"><span>Опыт<b>{xpReward(level,currentTier,xp).toLocaleString('ru-RU')} XP</b></span><span>Монеты<b>{coinReward(level,currentTier)}</b></span></div>
      <h3>Дополнительные награды</h3>
      <div className="mediaRow"><GameArt path="/game/items/egg.webp" size={40}/><Link className="textLink" to="/owl/mystery">Загадочное яйцо</Link><strong>{eggChances[index]}</strong></div>
      <div className="mediaRow"><GameArt path="/game/albums/1.webp" size={40}/><Link className="textLink" to="/collections">Набор стикеров</Link><strong>{stickerChances[index]}</strong></div>
      <details><summary>Шансы выпадения Notcoin ($NOT)</summary>
        <label className="field">Бонус к дропу $NOT из профиля совы, % <input type="number" min="0" value={farm} onChange={event => setFarm(Math.max(0, Number(event.target.value) || 0))}/></label>
        <p className="caption">Бонус из профиля учитывает экипировку, заточку и лигу.</p><Link className="textLink" to="/assets/gear">Как повысить бонус</Link>
        {notOdds(currentTier, farm).map(row => <div className="mediaRow" key={row.amount}><span>{row.amount.toLocaleString('ru-RU')} $NOT</span><strong>{row.chance === 0 ? '0%' : chanceLabel(row.chance)}</strong></div>)}
      </details>
      <p className="caption">Расчёт по базовым параметрам клиента. Сервер игры может менять условия. При заморозке опыта XP не начисляется.</p>
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