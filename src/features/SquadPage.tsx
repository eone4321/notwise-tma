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

function SiegeGuideCard({ onChatVisit, keepParent }: { onChatVisit?: () => void; keepParent: boolean }) {
  const linkState = keepParent ? { guideDetail: true } : undefined;
  return <section className="card siegeRulesCard" id="siege-rewards">
    <div className="siegeSectionHead">
      <h2><GameGlyph name="fight"/>Как проходят осады</h2>
      <p>Полный цикл от прокачки мощи до сбора наград в День празднования.</p>
    </div>

    <ul className="siegeSimpleSteps">
      <li>
        <span className="siegeStepNum">1</span>
        <div>
          <strong>Мощь осады: что это и как копить</strong>
          <p>Для атаки и защиты земель нужна личная мощь — она зависит от заработанных SP (ориентир: ~1 мощь за 100 SP, опыт XP на неё не влияет). Быстрее всего SP растёт на манекене в Додзё (особенно с навыками) и в боях. Ползунком выбираешь, сколько доступной мощи влить; остаток не сгорает и переходит в следующие раунды.</p>
        </div>
      </li>
      <li>
        <span className="siegeStepNum">2</span>
        <div>
          <strong>Три раунда по 8 часов и захват</strong>
          <p>Пока у сквада 0 земель, атакуй пограничные земли с краю карты или нейтральные участки (у ничейных стоит стартовый гарнизон). Когда земли уже есть — защищай свои и захватывай соседние по общим границам (перепрыгнуть через чужую территорию нельзя). Землю берёт сквад с большим вкладом мощи к концу 8 ч; при ничьей участок обнуляется.</p>
        </div>
      </li>
      <li>
        <span className="siegeStepNum">3</span>
        <div>
          <strong>Кто получает награды и в чём профит</strong>
          <p>Долю за раунд забирает каждый участник, кто вложил в этом раунде от 1 мощи, за все удержанные сквадом участки. После 3-го раунда наступает мирный День празднования: нажми «Забрать» — накопленные монеты и серебро (для свитков заточки, Морфера, Чиллера и Зажигалок) придут сразу, а баффы +1/+2 к статам включатся ровно на 24 часа.</p>
        </div>
      </li>
    </ul>

    <div className="siegeActionPair">
      <Link className="secondary" to="/squads/war" replace state={linkState}>
        <GameGlyph name="fight"/><span>Карта 20 земель</span>
      </Link>
      <a className="secondary" href={communityChat} onClick={() => { onChatVisit?.(); trackGuide('action:chat'); }}>
        <GameGlyph name="chat"/><span>Чат планирования осад</span>
      </a>
    </div>
  </section>;
}

function RitualCard() {
  return <section className="card ritualCard">
    <div className="mediaHeading">
      <GameArt path="/game/items/lighter.webp" size={44}/>
      <div>
        <h2>Ежедневный ритуал</h2>
        <p>Общий клановый бафф на 24 часа и ежедневные задания.</p>
      </div>
    </div>

    <div className="ritualStatsRow">
      <div>
        <span>Зажигалка</span>
        <strong><Price value={2500} currency="squad_silver"/></strong>
      </div>
      <div>
        <span>Запас</span>
        <strong>10 зарядов</strong>
      </div>
      <div>
        <span>Активация</span>
        <strong>50% сквада</strong>
      </div>
    </div>

    <p className="ritualSimpleCopy">
      Раз в сутки благословение расходует 1 заряд Зажигалки (250 серебра в день). Как только ритуал зажгут 50% участников сквада, всем включается бонус дня на 24 часа. Там же в игре находятся ежедневные клановые задания.
    </p>

    <DetailLink className="secondary ritualShopLink" to="/squads/shop">
      <GameGlyph name="shop"/><span>Открыть магазин сквада</span>
    </DetailLink>
  </section>;
}

function SquadShopView({ gameEntry }: { gameEntry: string }) {
  return <section className="card">
    <div className="mediaHeading">
      <span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={40}/></span>
      <div>
        <h2>Магазин сквада</h2>
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
          <span>Доступ</span>
          <strong>3+ / 4+ ур.</strong>
          <small>сквад с 3 ур. · война с 4 ур.</small>
        </div>
        <div className="squadKpiTile">
          <span>Цикл войны</span>
          <strong>3 × 8 часов</strong>
          <small>+ День празднования</small>
        </div>
        <div className="squadKpiTile">
          <span>Мощь осады</span>
          <strong>От твоих SP</strong>
          <small>~1 мощь за 100 SP</small>
        </div>
        <div className="squadKpiTile">
          <span>Доля наград</span>
          <strong>От 1 мощи</strong>
          <small>личного вклада в раунде</small>
        </div>
      </div>
    </section>

    <SiegeGuideCard onChatVisit={onChatVisit} keepParent={keepParent}/>
    <RitualCard/>
  </>;
}
