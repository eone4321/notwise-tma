import { Link, useLocation } from 'react-router';
import { DetailLink } from '../ui/DetailLink';
import { trackGuide } from './guideAnalytics';
import { useGuideLocale } from './guideLocale';
import { SquadMap } from './SquadMap';
import { Price } from './Price';
import squadShop from './squad-shop.json';
import { artSrc } from '../ui/warmArt';
import { GameGlyph } from '../ui/GameGlyph';
import { ItemHelp } from './ItemHelp';
import { GameArt } from '../ui/GameArt';
import { communityChat } from '../domain/guide-links';

const squadItemUse: Record<string, [string, string]> = {
  'scroll-enchant-ring': ['Заточить кольцо до +20', 'Enchant a ring up to +20'],
  'lighter': ['Благословить сквад (10 зарядов)', 'Bless the squad (10 charges)'],
  'scroll-enchant-skin': ['Усилить бонус скина к фарму', 'Boost skin coin bonus up to +20'],
  'morpher': ['Сбрасывает характеристики и навыки, сохраняя SP', 'Resets attributes and skills while keeping SP'],
  'chiller': ['Заморозить начисление XP', 'Freeze XP gain from capsules'],
};

const squadItemNameEn: Record<string, string> = {
  'scroll-enchant-ring': 'Ring Enchanter',
  'lighter': 'Lighter',
  'scroll-enchant-skin': 'Skin Enchanter',
  'morpher': 'Morpher',
  'chiller': 'Chiller',
};

function SquadNavTabs({ pathname, keepParent }: { pathname: string; keepParent: boolean }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const linkState = keepParent ? { guideDetail: true } : undefined;
  const isWar = pathname === '/squads/war';
  const isShop = pathname === '/squads/shop';
  const isOverview = !isWar && !isShop;

  return <nav className="choiceBar profileTabs squadNav" aria-label={en ? 'Squad sections' : 'Разделы сквадов'}>
    <Link to="/squads" replace state={linkState} aria-current={isOverview ? 'page' : undefined}>
      <GameGlyph name="shield"/>{en ? 'Overview' : 'Обзор'}
    </Link>
    <Link to="/squads/war" replace state={linkState} aria-current={isWar ? 'page' : undefined}>
      <GameGlyph name="fight"/>{en ? 'Territory Map' : 'Карта земель'}
    </Link>
    <Link to="/squads/shop" replace state={linkState} aria-current={isShop ? 'page' : undefined}>
      <GameGlyph name="shop"/>{en ? 'Shop' : 'Магазин'}
    </Link>
  </nav>;
}

function SiegeGuideCard({ onChatVisit, keepParent }: { onChatVisit?: () => void; keepParent: boolean }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const linkState = keepParent ? { guideDetail: true } : undefined;
  return <section className="card siegeRulesCard" id="siege-rewards">
    <div className="siegeSectionHead">
      <h2><GameGlyph name="fight"/>{en ? 'How sieges work' : 'Как проходят осады'}</h2>
      <p>{en ? 'Full cycle from building siege power to claiming rewards on Celebration Day.' : 'Полный цикл от прокачки мощи до сбора наград в День празднования.'}</p>
    </div>

    <ul className="siegeSimpleSteps">
      <li>
        <span className="siegeStepNum">1</span>
        <div>
          <strong>{en ? 'Siege power: what it is and how to build it' : 'Мощь осады: что это и как копить'}</strong>
          <p>{en
            ? 'Attacking and defending territories uses personal siege power, which grows with earned SP. XP does not affect it. The Dojo dummy and battles are good ways to earn SP. Use the slider to choose how much power to commit this round. The rest carries over.'
            : 'Для атаки и защиты земель нужна личная мощь. Она растёт вместе с заработанными SP, опыт XP на неё не влияет. Быстрее всего SP можно получить на манекене в Додзё и в боях. Ползунком выбери, сколько мощи вложить в раунд. Остаток сохранится для следующих раундов.'}</p>
        </div>
      </li>
      <li>
        <span className="siegeStepNum">2</span>
        <div>
          <strong>{en ? 'Three 8-hour rounds and territory capture' : 'Три раунда по 8 часов и захват'}</strong>
          <p>{en
            ? 'When your squad holds 0 territories, attack border territories on the edge of the map or neutral tiles (unclaimed tiles have a starting garrison). Once you hold territory, defend yours and expand into adjacent tiles that share a border (you cannot jump over enemy territory). The squad with the highest power contribution at the end of 8 hours wins the tile; ties reset the tile.'
            : 'Пока у сквада 0 земель, атакуй пограничные земли с краю карты или нейтральные участки (у ничейных стоит стартовый гарнизон). Когда земли уже есть — защищай свои и захватывай соседние по общим границам (перепрыгнуть через чужую территорию нельзя). Землю берёт сквад с большим вкладом мощи к концу 8ч; при ничьей участок обнуляется.'}</p>
        </div>
      </li>
      <li>
        <span className="siegeStepNum">3</span>
        <div>
          <strong>{en ? 'Rewards across 3 rounds and Celebration Day' : 'Награды за 3 раунда и День празднования'}</strong>
          <p>{en
            ? 'Each of the 3 rounds adds rewards separately into the shared siege pool: holding all 20 territories for 1 round grants 3,500 coins, 700 silver, and +8 to stats; 2 rounds (40 holds) grant 7,000 coins, 1,400 silver, and +16 to stats; and the maximum across all 3 rounds (60 holds) is 10,500 coins, 2,100 silver, and +24 to stats. Contribute at least 1 power in a round to earn your share for that round. On Celebration Day, tap Claim to collect all accumulated coins, silver, and stacked buffs (active for 24 hours from claiming) at once.'
            : 'Каждый из 3 раундов начисляет награды отдельно в общую копилку осады: все 20 земель за 1 раунд дают 3 500 монет, 700 серебра и +8 к статам, за 2 раунда (40 удержаний) — 7 000 монет, 1 400 серебра и +16 к статам, а максимум за все 3 раунда (60 удержаний) — 10 500 монет, 2 100 серебра и +24 к статам. Чтобы получить долю за раунд, вложи в нём хотя бы 1 мощь. В День празднования нажми «Забрать» — все накопленные монеты, серебро и суммарные баффы (на 24 часа с момента получения) выдаются разом.'}</p>
        </div>
      </li>
    </ul>

    <div className="siegeActionPair">
      <Link className="secondary" to="/squads/war" replace state={linkState}>
        <GameGlyph name="fight"/><span>{en ? 'Map of 20 Territories' : 'Карта 20 земель'}</span>
      </Link>
      <a className="secondary" href={communityChat} onClick={() => { onChatVisit?.(); trackGuide('action:chat'); }}>
        <GameGlyph name="chat"/><span>{en ? 'Siege planning chat' : 'Чат планирования осад'}</span>
      </a>
    </div>
  </section>;
}

function RitualCard() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  return <section className="card ritualCard">
    <div className="mediaHeading">
      <GameArt path="/game/items/lighter.webp" size={44}/>
      <div>
        <h2>{en ? 'Daily ritual' : 'Ежедневный ритуал'}</h2>
        <p>{en ? 'Shared 24-hour squad buff and daily quests.' : 'Общий клановый бафф на 24 часа и ежедневные задания.'}</p>
      </div>
    </div>

    <div className="ritualStatsRow">
      <div>
        <span>{en ? 'Lighter' : 'Зажигалка'}</span>
        <strong><Price value={2500} currency="squad_silver"/></strong>
      </div>
      <div>
        <span>{en ? 'Capacity' : 'Запас'}</span>
        <strong>{en ? '10 charges' : '10 зарядов'}</strong>
      </div>
      <div>
        <span>{en ? 'Activation' : 'Активация'}</span>
        <strong>{en ? '50% of squad' : '50% сквада'}</strong>
      </div>
    </div>

    <p className="ritualSimpleCopy">
      {en
        ? 'Once per day, a blessing uses 1 Lighter charge (250 silver per day). As soon as 50% of squad members light the ritual, the daily bonus activates for 24 hours. Daily squad quests are located on the same screen in-game.'
        : 'Раз в сутки благословение расходует 1 заряд Зажигалки (250 серебра в день). Как только ритуал зажгут 50% участников сквада, всем включается бонус дня на 24 часа. Там же в игре находятся ежедневные клановые задания.'}
    </p>

    <DetailLink className="secondary ritualShopLink" to="/squads/shop">
      <GameGlyph name="shop"/><span>{en ? 'Open squad shop' : 'Открыть магазин сквада'}</span>
    </DetailLink>
  </section>;
}

function SquadShopView({ gameEntry }: { gameEntry: string }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const lang = en ? 1 : 0;
  return <section className="card">
    <div className="mediaHeading">
      <span className="silverCoin"><GameArt path="/game/items/wise-coin.webp" size={40}/></span>
      <div>
        <h2>{en ? 'Squad shop' : 'Магазин сквада'}</h2>
        <p>{en ? 'Unlocks at level 3. Silver is earned by holding territories in sieges.' : 'Открыт с 3-го уровня. Серебро добывается за удержание территорий в осаде.'}</p>
      </div>
    </div>
    <ul className="compactList">{squadShop.map(item => {
      const title = en ? (squadItemNameEn[item.id] ?? item.name_ru) : item.name_ru;
      const use = squadItemUse[item.id]?.[lang] ?? '';
      return <li className="mediaRow" key={item.id}>
        <GameArt path={`/game/items/${item.id}.webp`} size={38}/>
        <div>
          <div className="squadShopTitle">
            <b>{title}</b>
            <ItemHelp name={title} file={item.id + '.webp'} effect={use} source={en ? 'Squad shop' : 'Лавка сквада'}/>
          </div>
          <small className="shopUse">{use}</small>
        </div>
        <strong><Price value={item.price} currency="squad_silver"/></strong>
      </li>;
    })}</ul>
    <a className="textLink" href={gameEntry} onClick={() => trackGuide('action:game')}>{en ? 'View shop in-game' : 'Посмотреть магазин в игре'}</a>
  </section>;
}

export function SquadPage({ gameEntry, onChatVisit }: { gameEntry: string; onChatVisit?: () => void }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
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
        <h2>{en ? 'Squads and Wars' : 'Сквады и войны'}</h2>
      </div>
      <div className="squadKpiGrid">
        <div className="squadKpiTile">
          <span>{en ? 'Access' : 'Доступ'}</span>
          <strong>{en ? 'Lvl 3+ / 4+' : '3+ / 4+ ур.'}</strong>
          <small>{en ? 'squad at lvl 3 · war at lvl 4' : 'сквад с 3 ур. · война с 4 ур.'}</small>
        </div>
        <div className="squadKpiTile">
          <span>{en ? 'War cycle' : 'Цикл войны'}</span>
          <strong>{en ? '3 × 8 hours' : '3 × 8 часов'}</strong>
          <small>{en ? '+ Celebration Day' : '+ День празднования'}</small>
        </div>
        <div className="squadKpiTile">
          <span>{en ? 'Siege power' : 'Мощь осады'}</span>
          <strong>{en ? 'From your SP' : 'От твоих SP'}</strong>
          <small>{en ? 'Grows with skill points' : 'Растёт с очками навыков'}</small>
        </div>
        <div className="squadKpiTile">
          <span>{en ? 'Reward share' : 'Доля наград'}</span>
          <strong>{en ? 'From 1 power' : 'От 1 мощи'}</strong>
          <small>{en ? 'personal contribution in round' : 'личного вклада в раунде'}</small>
        </div>
      </div>
    </section>

    <SiegeGuideCard onChatVisit={onChatVisit} keepParent={keepParent}/>
    <RitualCard/>
  </>;
}
