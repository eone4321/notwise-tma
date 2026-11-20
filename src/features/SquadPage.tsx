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

function SiegePowerCard() {
  return <section className="card siegePowerCard">
    <div className="mediaHeading">
      <GameArt path="/game/ui/fight-vs.png" size={42}/>
      <div>
        <h2>Откуда берётся мощь в осаде</h2>
        <p>Мощь даёт заработанный <strong>SP</strong>, а не опыт (XP).</p>
      </div>
    </div>
    <ul className="siegePowerList">
      <li><strong>Курс ~1 мощь за 100 SP.</strong> Например, около 2 610 SP дают <b>26 мощи</b>, а 5 684 SP — <b>57 мощи</b>.</li>
      <li><strong>Как копить быстрее:</strong> тренируйся в Додзё (обычные удары и прожатие экипированных навыков по чучелу платят SP) и используй навыки в боях.</li>
      <li><strong>Запас между раундами не сгорает:</strong> ты сам выбираешь, сколько доступной мощи вложить в атаку или защиту участка.</li>
    </ul>
  </section>;
}

function SiegeRulesCard({ onChatVisit }: { onChatVisit?: () => void }) {
  return <section className="card siegeRewards" id="siege-rewards">
    <h2>Правила и награды осады</h2>
    <ol className="siegeRewardRules">
      <li><strong>3 раунда по 8 часов.</strong> К концу каждого раунда территорию и её награду забирает сквад, вложивший больше всего мощи (при ничьей земля остаётся нейтральной).</li>
      <li><strong>Атака по цепочке.</strong> Бить и защищать можно только свои участки и соседние с ними (либо нейтральные на старте).</li>
      <li><strong>Обязательно вложи мощь в раунде.</strong> Награда начисляется только за те раунды, в которых ты лично участвовал в атаке или защите, и если твой сквад удержал участок до конца раунда.</li>
      <li><strong>Сбор в мирное время.</strong> После окончания осады нажми <b>«Забрать»</b> — накопленные монеты, серебро сквада и суточные баффы (+1/+2 к статам) сразу упадут на аккаунт. Баффы действуют 24 часа с момента сбора.</li>
    </ol>
    <details className="mediaDetails siegePayoutExample">
      <summary><span><strong>Пул всей карты за 1 раунд</strong><small>Если один сквад удержит все 20 участков</small></span></summary>
      <SiegeTotals totals={siegeRewardTotals}/>
    </details>
    <a className="secondary siegeChat" href={communityChat} onClick={() => { onChatVisit?.(); trackGuide('action:chat'); }}>
      <GameGlyph name="chat"/>Чат для планирования осад
    </a>
  </section>;
}

export function SquadPage({ gameEntry, onChatVisit }: { gameEntry: string; onChatVisit?: () => void }) {
  const { pathname } = useLocation();
  if (pathname === '/squads/war') {
    return <>
      <SiegePowerCard/>
      <SquadMap/>
      <SiegeRulesCard onChatVisit={onChatVisit}/>
      <section className="card">
        <DetailLink to="/squads/shop" className="textLink">Открыть магазин за серебро сквада</DetailLink>
      </section>
    </>;
  }
  if (pathname === '/squads/shop') return <section className="card">
    <div className="mediaHeading"><span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={40}/></span>
      <div><h2>Магазин сквада</h2><p>С 3-го уровня. Серебро добывается за удержание территорий в осаде.</p></div>
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
      <h2>Сквады и осады</h2>
      <p>Вступить в сквад можно с <strong>3-го уровня</strong>, участвовать в осаде — с <strong>4-го</strong>. Осада идёт 3 раунда по 8 часов, победители получают монеты, серебро сквада и временные баффы к характеристикам.</p>
    </section>
    <SiegePowerCard/>
    <SquadMap/>
    <SiegeRulesCard onChatVisit={onChatVisit}/>
    <section className="card">
      <div className="mediaHeading"><GameArt path="/game/items/lighter.webp" size={45}/>
        <div><h2>Ежедневный ритуал</h2><p>Общий клановый бафф на 24 часа.</p></div>
      </div>
      <p>Одно благословение тратит 1 заряд Зажигалки. Если ритуал выполняет половина участников сквада, бонус активируется для всего клана на сутки.</p>
      <p><strong>Зажигалка в Лавке · {shopPrice('lighter')}</strong></p>
    </section>
  </>;
}
