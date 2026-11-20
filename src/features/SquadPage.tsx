import { Link, useLocation } from 'react-router';
import { DetailLink } from '../ui/DetailLink';
import { trackGuide } from './guideAnalytics';
import { SquadMap } from './SquadMap';
import { Price } from './Price';
import squadShop from './squad-shop.json';
import { artSrc } from '../ui/warmArt';
import { GameGlyph } from '../ui/GameGlyph';
import { ItemHelp } from './ItemHelp';
import { GameArt } from '../ui/GameArt';
import { communityChat } from '../domain/guide-links';

const squadItemUse: Record<string, string> = {
  'scroll-enchant-ring': 'Заточить кольцо до +20',
  'lighter': 'Благословить сквад (10 зарядов)',
  'scroll-enchant-skin': 'Усилить бонус скина к фарму',
  'morpher': 'Сбрасывает характеристики и навыки, сохраняя SP',
  'chiller': 'Заморозить начисление XP',
};

function SquadNavTabs({ pathname, keepParent }: { pathname: string; keepParent: boolean }) {
  const linkState = keepParent ? { guideDetail: true } : undefined;
  const isWar = pathname === '/squads/war';
  const isShop = pathname === '/squads/shop';
  const isOverview = !isWar && !isShop;

  return <nav className="choiceBar profileTabs squadNav" aria-label="Разделы сквадов">
    <Link to="/squads" replace state={linkState} aria-current={isOverview ? 'page' : undefined}>
      <GameGlyph name="shield"/>Обзор
    </Link>
    <Link to="/squads/war" replace state={linkState} aria-current={isWar ? 'page' : undefined}>
      <GameGlyph name="fight"/>Карта земель
    </Link>
    <Link to="/squads/shop" replace state={linkState} aria-current={isShop ? 'page' : undefined}>
      <GameGlyph name="shop"/>Магазин
    </Link>
  </nav>;
}

function SiegeSimpleRules({ onChatVisit, keepParent }: { onChatVisit?: () => void; keepParent: boolean }) {
  const linkState = keepParent ? { guideDetail: true } : undefined;
  return <section className="card siegeRulesCard" id="siege-rewards">
    <div className="siegeSectionHead">
      <h2>⚔️ Как работает осада</h2>
      <p>Коротко о захвате, мощи и получении наград.</p>
    </div>

    <ul className="siegeSimpleSteps">
      <li>
        <span className="siegeStepNum">1</span>
        <div>
          <strong>Захват и защита земель</strong>
          <p>Пока земель нет — атакуй крайние участки карты. Когда появятся свои — защищай их и захватывай соседние.</p>
        </div>
      </li>
      <li>
        <span className="siegeStepNum">2</span>
        <div>
          <strong>Откуда берётся мощь</strong>
          <p>Мощь растёт от прокачки в Додзё (чучело + навыки) и боёв, а не от уровня. Побеждает сквад с большим вкладом за 8 часов; остаток мощи переносится.</p>
        </div>
      </li>
      <li>
        <span className="siegeStepNum">3</span>
        <div>
          <strong>Когда дают награды и баффы</strong>
          <p>Вложи в раунде от 1 мощи в удержанный участок. После 3-го раунда нажми «Забрать» — баффы к статам включатся на 24 часа.</p>
        </div>
      </li>
    </ul>

    <div className="siegeActionPair">
      <Link className="secondary" to="/squads/war" replace state={linkState}>
        <GameGlyph name="fight"/>Открыть карту земель
      </Link>
      <a className="secondary" href={communityChat} onClick={() => { onChatVisit?.(); trackGuide('action:chat'); }}>
        <GameGlyph name="chat"/>Чат осад
      </a>
    </div>
  </section>;
}

function RitualCard() {
  return <section className="card ritualCard">
    <div className="mediaHeading">
      <GameArt path="/game/items/lighter.webp" size={44}/>
      <div>
        <h2>🕯️ Ежедневный ритуал</h2>
        <p>Общий бафф дня на 24 часа для всего сквада.</p>
      </div>
    </div>

    <div className="ritualStatsRow">
      <div><span>Зажигалка</span><strong><Price value={2500} currency="squad_silver"/></strong></div>
      <div><span>Хватит на</span><strong>🔥 10 дней</strong></div>
      <div><span>Порог</span><strong>50% сквада</strong></div>
    </div>

    <p className="ritualSimpleCopy">
      Когда половина участников сквада зажигает ритуал за день (1 заряд = 250 серебра), весь сквад получает бонус дня на 24 часа. Там же доступны ежедневные задания.
    </p>

    <DetailLink className="secondary ritualShopLink" to="/squads/shop">
      <GameGlyph name="shop"/>Открыть магазин сквада
    </DetailLink>
  </section>;
}

function SquadShopView({ gameEntry }: { gameEntry: string }) {
  return <section className="card">
    <div className="mediaHeading">
      <span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={40}/></span>
      <div>
        <h2>🛒 Магазин сквада</h2>
        <p>Открыт с 3-го уровня. Серебро добывается за удержание территорий в осаде.</p>
      </div>
    </div>
    <ul className="compactList">{squadShop.map(item => <li className="mediaRow" key={item.id}>
      <GameArt path={`/game/items/${item.id}.webp`} size={38}/>
      <div>
        <div className="squadShopTitle">
          <b>{item.name_ru}</b>
          <ItemHelp name={item.name_ru} file={item.id + '.webp'} effect={squadItemUse[item.id]} source="Лавка сквада"/>
        </div>
        <small className="shopUse">{squadItemUse[item.id]}</small>
      </div>
      <strong><Price value={item.price} currency="squad_silver"/></strong>
    </li>)}</ul>
    <a className="textLink" href={gameEntry} onClick={() => trackGuide('action:game')}>Посмотреть магазин в игре</a>
  </section>;
}

export function SquadPage({ gameEntry, onChatVisit }: { gameEntry: string; onChatVisit?: () => void }) {
  const { pathname, state } = useLocation();
  const keepParent = (state as { guideDetail?: boolean } | null)?.guideDetail === true;

  if (pathname === '/squads/war') {
    return <>
      <SquadNavTabs pathname={pathname} keepParent={keepParent}/>
      <SquadMap/>
    </>;
  }

  if (pathname === '/squads/shop') {
    return <>
      <SquadNavTabs pathname={pathname} keepParent={keepParent}/>
      <SquadShopView gameEntry={gameEntry}/>
    </>;
  }

  return <>
    <SquadNavTabs pathname={pathname} keepParent={keepParent}/>

    <section className="card squadIntroCard">
      <div className="squadScrollBanner">
        <img className="squadHeroImg" src={artSrc('/game/war/siege-header.webp')} alt="" />
        <h2>Сквады и войны</h2>
      </div>
      <div className="squadKpiGrid">
        <div className="squadKpiTile">
          <span>🏰 Вход</span>
          <strong>3+ / 4+ ур.</strong>
          <small>сквад с 3 ур. · война с 4 ур.</small>
        </div>
        <div className="squadKpiTile">
          <span>⏱️ Длительность</span>
          <strong>3 × 8 часов</strong>
          <small>затем сбор наград</small>
        </div>
        <div className="squadKpiTile">
          <span>⚡ Мощь осады</span>
          <strong>Додзё и бои</strong>
          <small>качается активностью, не XP</small>
        </div>
        <div className="squadKpiTile">
          <span>🎯 Для награды</span>
          <strong>От 1 мощи</strong>
          <small>вложить в раунд</small>
        </div>
      </div>
    </section>

    <SiegeSimpleRules onChatVisit={onChatVisit} keepParent={keepParent}/>
    <RitualCard/>
  </>;
}
