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
  const { hash } = useLocation();
  const currentTier = tiers.find(tier => hash === '#' + tier) ?? 'dark';
  const index = tiers.indexOf(currentTier);
  const hours = duration[currentTier] / 3_600_000;
  const [level, setLevel] = useState(8);
  const [farm, setFarm] = useState(0);
  return <>
    <p className="intro">Победа в рейтинговом бою даёт шанс получить капсулу, если есть свободный слот.</p>
    <nav className="choiceBar" aria-label="Виды капсул">
      {tiers.map(tier => <Link key={tier} to={'#' + tier} aria-current={tier === currentTier ? 'true' : undefined}>
        <GameArt path={`/game/capsules/${tier}.webp`} size={36}/>{tierNames[tier]}
      </Link>)}
    </nav>
    <CapsulePrices key={currentTier} tier={currentTier}/>
    <section className="card">
      <div className="mediaHeading"><GameArt path={`/game/capsules/${currentTier}.webp`} size={72}/><div>
        <h2>{tierNames[currentTier]} капсула</h2><p>{capsuleNames[index]} · открывается через {hours} ч</p>
      </div></div>
      <h3>Гарантированные награды</h3>
      <label className="field">Уровень капсулы <input type="number" min="1" max="99" value={level} onChange={event => setLevel(Math.min(99, Math.max(1, Math.trunc(Number(event.target.value)))))} /></label>
      <div className="stats"><span>Опыт<b>{xpReward(level,currentTier,xp).toLocaleString('ru-RU')} XP</b></span><span>Монеты<b>{coinReward(level,currentTier)}</b></span></div>
      <h3>Дополнительные награды</h3>
      <div className="mediaRow"><GameArt path="/game/items/egg.webp" size={40}/><Link className="textLink" to="/owl">Загадочное яйцо</Link><strong>{eggChances[index]}</strong></div>
      <div className="mediaRow"><GameArt path="/game/albums/1.webp" size={40}/><Link className="textLink" to="/collections">Набор стикеров</Link><strong>{stickerChances[index]}</strong></div>
      <details><summary>Шансы выпадения Notcoin ($NOT)</summary>
        <label className="field">Бонус к дропу $NOT из профиля совы, % <input type="number" min="0" value={farm} onChange={event => setFarm(Math.max(0, Number(event.target.value) || 0))}/></label>
        <p className="caption">Бонус зависит от экипировки, заточки и лиги. Он меняет шансы $NOT, а не цену открытия.</p>
        {notOdds(currentTier, farm).map(row => <div className="mediaRow" key={row.amount}><span>{row.amount.toLocaleString('ru-RU')} $NOT</span><strong>{row.chance === 0 ? '0%' : chanceLabel(row.chance)}</strong></div>)}
      </details>
      <p className="caption">Расчёт по базовым параметрам клиента. Сервер игры может менять условия. При заморозке опыта XP не начисляется.</p>
    </section>
    <section className="card"><h2>Как открыть больше слотов</h2>
      <p>Первые три слота доступны сразу. Слоты 4–11 открываются за уровень или Stars. Слот 12 открывается за 200 ⭐.</p>
      <details><summary>Требования к каждому слоту</summary>
        {Array.from({length:8}, (_,i) => <div className="mediaRow" key={i}><span>Слот {i+4}</span><strong>{(i+1)*10} ур. или {(500*2**i).toLocaleString('ru-RU')} ⭐</strong></div>)}
      </details>
    </section>
  </>;
}
