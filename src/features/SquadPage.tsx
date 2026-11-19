import { DetailLink } from '../ui/DetailLink';
import { trackGuide } from './guideAnalytics';
import { SquadMap } from './SquadMap';
import { Price } from './Price';
import squadShop from './squad-shop.json';
import { artSrc } from '../ui/warmArt';
import { Link, useLocation } from 'react-router';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { shopPrice } from './shop';
import { communityChat } from '../domain/guide-links';

const squadItemUse: Record<string, string> = {
  'scroll-enchant-ring': 'Заточить кольцо до +20',
  'lighter': 'Благословить сквад',
  'scroll-enchant-skin': 'Усилить бонус скина к фарму',
  'morpher': 'Сбрасывает характеристики и навыки, сохраняя SP',
  'chiller': 'Заморозить начисление XP',
};

function SiegeRewards() {
  return <section className="card siegeRewards" id="siege-rewards">
    <h2>Награды за осаду</h2>
    <p>За удержанные территории можно получить монеты, серебро сквада и усиления характеристик на 24 часа. Доля начисляется за раунды, в которых ты атаковал. Забери её в День празднования.</p>
    <h3>Пример выплаты за 20 удержанных территорий</h3>
    <dl className="siegeRewardsGrid">
      <div><dt>Монеты</dt><dd><Price value={3500} currency="coins"/></dd></div>
      <div><dt>Серебро сквада</dt><dd><Price value={700} currency="squad_silver"/></dd></div>
      {([
        ['wisdom', 'Мудрость', 8], ['endurance', 'Выносливость', 2],
        ['agility', 'Ловкость', 4], ['strength', 'Сила', 4],
      ] as const).map(([attribute, label, amount]) => <div key={attribute}>
        <dt>{label}</dt><dd>+{amount} <GameAttribute name={attribute}/></dd>
      </div>)}
    </dl>
    <p className="caption">Суммы из игрового отчёта. Твоя выплата зависит от территорий и участия в раундах.</p>
    <a className="secondary siegeChat" href={communityChat} onClick={() => trackGuide('action:chat')}>
      <GameGlyph name="chat"/>Чат для планирования осад
    </a>
    <details className="mediaDetails siegeRewardDetails">
      <summary><strong>Примеры наград за территории</strong></summary>
      <ul className="compactList">
        <li className="mediaRow"><span>Янтарная роща</span><Price value={500} currency="coins"/></li>
        <li className="mediaRow"><span>Рассветный лес</span><Price value={100} currency="squad_silver"/></li>
        <li className="mediaRow"><span>Глухолесье</span><strong>+5 к мудрости</strong></li>
        <li className="mediaRow"><span>Папоротниковая долина</span><Price value={500} currency="coins"/></li>
        <li className="mediaRow"><span>Лисья низина</span><strong>+2 к выносливости</strong></li>
      </ul>
    </details>
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
