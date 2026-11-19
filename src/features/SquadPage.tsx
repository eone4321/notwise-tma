import { trackGuide } from './guideAnalytics';
import { SquadMap } from './SquadMap';
import { Price } from './Price';
import squadShop from './squad-shop.json';
import { artSrc } from '../ui/warmArt';
import { Link, useLocation } from 'react-router';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { shopPrice } from './shop';

const squadItemUse: Record<string, string> = {
  'scroll-enchant-ring': 'Заточить кольцо до +20',
  'lighter': 'Благословить сквад',
  'scroll-enchant-skin': 'Усилить бонус скина к фарму',
  'morpher': 'Сбрасывает характеристики и навыки, сохраняя SP',
  'chiller': 'Заморозить начисление XP',
};

export function SquadPage({ gameEntry }: { gameEntry: string }) {
  const { pathname } = useLocation();
  if (pathname === '/squads/war') return <><SquadMap/><section className="card squadIntro">
    <h2>Как участвовать в осаде</h2>
    <ol className="referralSteps">
      <li>Вступи в сквад. С 4-го уровня откроется карта осады.</li>
      <li>Выбери территорию и атакуй в текущем раунде. В сутки три раунда по 8 часов.</li>
      <li>После раунда награду получает сквад, который удержал территорию.</li>
      <li>В день празднования забери свою долю за раунды, в которых ты атаковал. Усиление действует 24 часа после получения.</li>
    </ol>
    <Link to="/squads/shop" className="textLink">Магазин за серебро сквада</Link>
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
    <SquadMap/>
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
