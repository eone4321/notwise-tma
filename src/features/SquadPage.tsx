import { DetailLink } from '../ui/DetailLink';
import { trackGuide } from './guideAnalytics';
import { SiegeRewardValue, SquadMap } from './SquadMap';
import { Price } from './Price';
import squadShop from './squad-shop.json';
import { artSrc } from '../ui/warmArt';
import { Link, useLocation } from 'react-router';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { shopPrice } from './shop';
import { communityChat } from '../domain/guide-links';
import { siegeRewardLabels, siegeRewardTotals } from './siege-rewards';

const squadItemUse: Record<string, string> = {
  'scroll-enchant-ring': 'Заточить кольцо до +20',
  'lighter': 'Благословить сквад',
  'scroll-enchant-skin': 'Усилить бонус скина к фарму',
  'morpher': 'Сбрасывает характеристики и навыки, сохраняя SP',
  'chiller': 'Заморозить начисление XP',
};

function SiegeTotals({ totals }: { totals: typeof siegeRewardTotals }) {
  return <dl className="siegeRewardsGrid">
    {(Object.keys(siegeRewardLabels) as (keyof typeof siegeRewardLabels)[]).map(kind => <div key={kind}>
      <dt>{siegeRewardLabels[kind]}</dt><dd><SiegeRewardValue kind={kind} amount={totals[kind] ?? 0}/></dd>
    </div>)}
  </dl>;
}

function SiegeRewards() {
  return <section className="card siegeRewards" id="siege-rewards">
    <h2>Награды за осаду</h2>
    <p>За удержанные территории можно получить монеты, серебро сквада и усиления на 24 часа. Награда учитывает раунды, в которых ты атаковал. Забери её в День празднования.</p>
    <h3>Все 20 участков за один раунд</h3>
    <SiegeTotals totals={siegeRewardTotals}/>
    <p className="caption">Карта проверена 20 ноября 2026. Игра суммирует награды по раундам. Один участок засчитывается заново в каждом раунде, в котором его удержал сквад.</p>
    <details className="mediaDetails siegePayoutExample">
      <summary><strong>Пример выплаты за 40 удержаний</strong></summary>
      <p>В игровом отчёте это сумма за несколько раундов. На этой карте такой итог дают два раунда с удержанием всех 20 участков.</p>
      <SiegeTotals totals={{ coins: 7000, squad_silver: 1400, wisdom: 6, endurance: 2, agility: 4, strength: 4 }}/>
    </details>
    <a className="secondary siegeChat" href={communityChat} onClick={() => trackGuide('action:chat')}>
      <GameGlyph name="chat"/>Чат для планирования осад
    </a>
  </section>;
}

export function SquadPage({ gameEntry }: { gameEntry: string }) {
  const { pathname } = useLocation();
  if (pathname === '/squads/war') return <><SiegeRewards/><SquadMap/><section className="card squadIntro">
    <h2>Как участвовать в осаде</h2>
    <ol className="referralSteps">
      <li>Вступи в сквад. С 4-го уровня откроется карта осады.</li>
      <li>Выбери территорию и атакуй в текущем раунде. В сутки три раунда по 8 часов.</li>
      <li>После раунда награду получает сквад, который удержал территорию.</li>
      <li>В день празднования забери свою долю за раунды, в которых ты атаковал. Усиление действует 24 часа после получения.</li>
    </ol>
    <DetailLink to="/squads/shop" className="textLink">Магазин за серебро сквада</DetailLink>
  </section></>;
  if (pathname === '/squads/shop') return <section className="card">
    <div className="mediaHeading"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={40}/></span>
      <div><h2>Магазин сквада</h2><p>С 3-го уровня. Серебро можно заработать в осаде.</p></div>
    </div>
    <ul className="compactList">{squadShop.map(item => <li className="mediaRow" key={item.id}>
      <GameArt path={`/game/items/${item.id}.webp`} size={38}/>
      <span><b>{item.name_ru}</b><small className="shopUse">{squadItemUse[item.id]}</small></span><strong><Price value={item.price} currency="squad_silver"/></strong>
    </li>)}</ul>
    <a className="textLink" href={gameEntry} onClick={() => trackGuide('action:game')}>Посмотреть магазин в игре</a>
  </section>;
  return <>
    <nav className="choiceBar profileTabs squadNav" aria-label="Сквады">
      <Link to="/squads/war"><GameGlyph name="fight"/>Карта и осада</Link>
      <Link to="/squads/shop"><GameGlyph name="shop"/>Магазин сквада</Link>
    </nav>
    <section className="card squadIntro">
      <img src={artSrc('/game/war/siege-header.webp')} alt="" />
      <h2>Осада и территории</h2>
      <p>Сквады доступны с 3-го уровня, война — с 4-го. Один раунд длится 8 часов. В конце раунда награду получает сквад, который удерживает территорию.</p>
      <Link className="textLink" to="/squads/war">Как участвовать и забрать награду</Link>
    </section>
    <SiegeRewards/>
    <SquadMap/>
    <section className="card">
      <div className="mediaHeading"><GameArt path="/game/items/lighter.webp" size={45}/><h2>Ежедневный ритуал</h2></div>
      <p>Одно благословение тратит заряд зажигалки. Если ритуал выполняет половина сквада, участники получают бонус на сутки.</p>
      <p><strong>Зажигалка в Лавке · {shopPrice('lighter')}</strong></p>
    </section>
  </>;
}
