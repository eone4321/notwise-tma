import { artSrc } from '../ui/warmArt';
import { Link, useLocation } from 'react-router';
import { GameArt } from '../ui/GameArt';
import { shopPrice } from './shop';

export function SquadPage() {
  const { pathname } = useLocation();
  if (pathname === '/squads/war') return <section className="card squadIntro">
    <img width="400" height="150" src={artSrc('/game/war/siege-header.webp')} alt=""/>
    <h2>Как участвовать в осаде</h2>
    <ol className="referralSteps">
      <li>Вступи в сквад. С 4-го уровня откроется карта осады.</li>
      <li>Выбери территорию и атакуй в текущем раунде. В сутки три раунда по 8 часов.</li>
      <li>После раунда награду получает сквад, который удержал территорию.</li>
      <li>В день празднования забери свою долю за раунды, в которых ты атаковал. Усиление действует 24 часа после получения.</li>
    </ol>
    <Link to="/squads/shop" className="textLink">Магазин за серебро сквада</Link>
  </section>;
  if (pathname === '/squads/shop') return <section className="card">
    <div className="mediaHeading"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={40}/></span>
      <div><h2>Магазин сквада</h2><p>С 3-го уровня совы. Оплата серебром сквада (Ⓢ).</p></div>
    </div>
    <div className="mediaRow"><GameArt path="/game/items/scroll-enchant-ring.webp" size={38}/><span>Заточка кольца</span><strong className="inventoryPrice"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={16}/></span>500</strong></div>
    <div className="mediaRow"><GameArt path="/game/items/lighter.webp" size={38}/><span>Зажигалка</span><strong className="inventoryPrice"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={16}/></span>1 000</strong></div>
    <div className="mediaRow"><GameArt path="/game/items/scroll-enchant-skin.webp" size={38}/><span>Заточка скина</span><strong className="inventoryPrice"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={16}/></span>5 000</strong></div>
    <div className="mediaRow"><GameArt path="/game/items/morpher.webp" size={38}/><span>Морфер</span><strong className="inventoryPrice"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={16}/></span>5 000</strong></div>
    <div className="mediaRow"><GameArt path="/game/items/chiller.webp" size={38}/><span>Чиллер</span><strong className="inventoryPrice"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={16}/></span>25 000</strong></div>
    <p className="caption">Серебро зарабатывается в осадах территорий (3 раунда в сутки по 8 часов). Чиллер в скваде стоит 25 000 серебра (вместо 100 000 золотых монет в обычной лавке).</p>
    <a className="textLink" href="https://t.me/notwise_bot/thegame">Посмотреть магазин в игре</a>
  </section>;
  return <>
    <section className="card squadIntro">
      <img src={artSrc('/game/war/siege-header.webp')} alt="" />
      <h2>Осада и территории</h2>
      <p>Сквады доступны с 3-го уровня, война — с 4-го. Один раунд длится 8 часов. В конце раунда награду получает сквад, который удерживает территорию.</p>
      <Link className="textLink" to="/squads/war">Как участвовать и забрать награду</Link>
    </section>
    <section className="card">
      <Link className="sectionLink textLink" to="/squads/shop"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={26}/></span>Магазин сквада</Link>
      <h2>Территории</h2>
      <details><summary>20 территорий на карте</summary><ul className="compactList">{['Heart of the Forest', 'Pine Ridge', 'Moon Grove', 'Ember Glade', 'Moss Hollow', 'Old Roots', 'Silver Thicket', 'High Pines', 'Mist Pass', 'Dawn Wood', 'Amber Grove', 'Fox Hollow', 'Sun Glade', 'Fern Valley', 'Deep Wood', 'Stone Roots', 'Raven Wood', 'Silent Grove', 'Frost Ridge', 'Watch Pines'].map(name =>
        <li className="mediaRow" key={name}>{name}</li>)}</ul></details>
    </section>
    <section className="card">
      <h2>Как получить награду</h2>
      <p>Атакуй во время раунда, чтобы получить свою долю. Территории дают серебро сквада, обычные монеты или +1–2 к атрибуту. Усиление действует 24 часа после получения награды.</p>
    </section>
    <section className="card">
      <div className="mediaHeading"><GameArt path="/game/items/lighter.webp" size={45}/><h2>Ежедневный ритуал</h2></div>
      <p>Одно благословение тратит заряд зажигалки. Если ритуал выполняет половина сквада, участники получают бонус на сутки.</p>
      <p><strong>Зажигалка в Лавке · {shopPrice('lighter')}</strong></p>
    </section>
  </>;
}
