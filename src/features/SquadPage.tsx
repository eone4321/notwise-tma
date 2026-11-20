import { DetailLink } from '../ui/DetailLink';
import { trackGuide } from './guideAnalytics';
import { SiegeRewardValue, SquadMap } from './SquadMap';
import { Price } from './Price';
import squadShop from './squad-shop.json';
import { artSrc } from '../ui/warmArt';
import { useLocation } from 'react-router';
import { GameGlyph } from '../ui/GameGlyph';
import { ItemHelp } from './ItemHelp';
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

function SiegeRewards({ onChatVisit }: { onChatVisit?: () => void }) {
  return <section className="card siegeRewards" id="siege-rewards">
    <h2>Награды за осаду</h2>
    <ol className="siegeRewardRules">
      <li><strong>Удержите участок до конца раунда.</strong> У каждого участка одна награда: монеты, серебро сквада или усиление. Тапни по участку на карте, чтобы увидеть, что он даёт.</li>
      <li><strong>Атакуй в раунде, чтобы получить награду.</strong> Учитываются все участки, которые сквад удержал к концу раунда с твоим участием в атаке.</li>
      <li><strong>Забери выплату в День празднования.</strong> Игра складывает награды за такие раунды. Усиления действуют 24 часа с получения.</li>
    </ol>
    <div className="siegeRoundExample">
      <h3>Почему в отчёте может быть 40 территорий</h3>
      <p>Один участок может принести награду в каждом раунде. Например, Янтарная роща даёт 500 монет. Если сквад удержал её два раунда и ты атаковал в обоих, за рощу придёт 1 000 монет.</p>
      <p><strong>20 участков × 2 раунда = 40 удержаний</strong> в отчёте. Два полных раунда по этой карте дают 7 000 монет, 1 400 серебра и усиления: +6 мудрости, +2 выносливости, +4 ловкости и +4 силы.</p>
    </div>
    <details className="mediaDetails siegePayoutExample">
      <summary><span><strong>Сколько дают все 20 участков</strong><small>Пример удержания всей карты за один раунд</small></span></summary>
      <SiegeTotals totals={siegeRewardTotals}/>
    </details>
    <a className="secondary siegeChat" href={communityChat} onClick={() => { onChatVisit?.(); trackGuide('action:chat'); }}>
      <GameGlyph name="chat"/>Чат для планирования осад
    </a>
  </section>;
}

export function SquadPage({ gameEntry, onChatVisit }: { gameEntry: string; onChatVisit?: () => void }) {
  const { pathname } = useLocation();
  if (pathname === '/squads/war') return <><SiegeRewards onChatVisit={onChatVisit}/><SquadMap/><section className="card squadIntro">
    <h2>Как участвовать в осаде</h2>
    <ol className="referralSteps">
      <li>Вступи в сквад. С 4-го уровня откроется карта осады.</li>
      <li>Выбери территорию и атакуй в текущем раунде. В сутки три раунда по 8 часов.</li>
      <li>После раунда награду получает сквад, который удержал территорию.</li>
      <li>В день празднования забери награду за раунды, в которых ты атаковал. Усиление действует 24 часа после получения.</li>
    </ol>
    <DetailLink to="/squads/shop" className="textLink">Магазин за серебро сквада</DetailLink>
  </section></>;
  if (pathname === '/squads/shop') return <section className="card">
    <div className="mediaHeading"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={40}/></span>
      <div><h2>Магазин сквада</h2><p>С 3-го уровня. Серебро можно заработать в осаде.</p></div>
    </div>
    <ul className="compactList">{squadShop.map(item => <li className="mediaRow" key={item.id}>
      <GameArt path={`/game/items/${item.id}.webp`} size={38}/>
      <div><div className="squadShopTitle"><b>{item.name_ru}</b>
        <ItemHelp name={item.name_ru} file={item.id + '.webp'} effect={squadItemUse[item.id]} source="Лавка сквада"/>
      </div><small className="shopUse">{squadItemUse[item.id]}</small></div><strong><Price value={item.price} currency="squad_silver"/></strong>
    </li>)}</ul>
    <a className="textLink" href={gameEntry} onClick={() => trackGuide('action:game')}>Посмотреть магазин в игре</a>
  </section>;
  return <>
    <nav className="choiceBar profileTabs squadNav" aria-label="Сквады">
      <DetailLink to="/squads/war"><GameGlyph name="fight"/>Карта и осада</DetailLink>
      <DetailLink to="/squads/shop"><GameGlyph name="shop"/>Магазин сквада</DetailLink>
    </nav>
    <section className="card squadIntro">
      <img src={artSrc('/game/war/siege-header.webp')} alt="" />
      <h2>Осада и территории</h2>
      <p>Сквады доступны с 3-го уровня, война — с 4-го. Один раунд длится 8 часов. В конце раунда награду получает сквад, который удерживает территорию.</p>
      <DetailLink className="textLink" to="/squads/war">Как участвовать и забрать награду</DetailLink>
    </section>
    <SiegeRewards onChatVisit={onChatVisit}/>
    <SquadMap/>
    <section className="card">
      <div className="mediaHeading"><GameArt path="/game/items/lighter.webp" size={45}/><h2>Ежедневный ритуал</h2></div>
      <p>Одно благословение тратит заряд зажигалки. Если ритуал выполняет половина сквада, участники получают бонус на сутки.</p>
      <p><strong>Зажигалка в Лавке · {shopPrice('lighter')}</strong></p>
    </section>
  </>;
}
