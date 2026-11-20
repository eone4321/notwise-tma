import { useState } from 'react';
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

const spPresets = [1000, 2610, 5684, 10000, 25000] as const;
const ritualPresets = [25, 45, 50, 75, 100] as const;

type WarStageId = 'capture' | 'chain' | 'peace';

const warStages: {
  id: WarStageId;
  tab: string;
  title: string;
  points: { icon: string; lead: string; text: string }[];
}[] = [
  {
    id: 'capture',
    tab: '1️⃣ Старт и захват',
    title: 'Как входить в осаду и брать первые земли',
    points: [
      {
        icon: '🚪',
        lead: 'С чего начать без земель',
        text: 'Пока у сквада 0 территорий, открыты 10 пограничных треугольников и нейтральные земли.',
      },
      {
        icon: '🛡️',
        lead: 'Нейтральный гарнизон',
        text: 'Ничейные земли с самого начала прикрыты базовым гарнизоном — нужно перебить его вклад.',
      },
      {
        icon: '⚖️',
        lead: 'Контроль ползунком',
        text: 'В каждый раунд сам выбираешь, сколько доступной мощи влить в атаку или в защиту.',
      },
    ],
  },
  {
    id: 'chain',
    tab: '2️⃣ Цепочка и ничья',
    title: 'Маршруты по граням и спорные земли',
    points: [
      {
        icon: '🔗',
        lead: 'Движение от своих земель',
        text: 'Когда есть хотя бы 1 территория, можно защищать свои и бить соседние по общим граням.',
      },
      {
        icon: '🚧',
        lead: 'Чужие земли не проход',
        text: 'Перепрыгнуть или пройти через вражеский участок нельзя — цепочка должна быть связной.',
      },
      {
        icon: '🤝',
        lead: 'Равенство мощи = сброс',
        text: 'Если два лидера влили ровно одинаковую мощь к концу раунда, земля обнуляется и не достаётся никому.',
      },
    ],
  },
  {
    id: 'peace',
    tab: '3️⃣ Итоги и сбор',
    title: 'Условие награды и 24-часовые баффы',
    points: [
      {
        icon: '🎯',
        lead: 'Личное участие обязательно',
        text: 'Чтобы получить долю награды за выигранный раунд, нужно лично вложить от 1 мощи именно в этом раунде.',
      },
      {
        icon: '🕊️',
        lead: 'Кнопка «Забрать» в перемирие',
        text: 'После 3-го раунда начинается мирная фаза: нажми «Забрать», чтобы получить все монеты, серебро и баффы.',
      },
      {
        icon: '⏳',
        lead: 'Баффы на 24 часа с нажатия',
        text: 'Усиления (+1 или +2 к характеристике) начинают тикать 24 часа ровно в момент, когда нажал «Забрать».',
      },
    ],
  },
];

function SquadNavTabs({ pathname, keepParent }: { pathname: string; keepParent: boolean }) {
  const linkState = keepParent ? { guideDetail: true } : undefined;
  const isWar = pathname === '/squads/war';
  const isShop = pathname === '/squads/shop';
  const isOverview = !isWar && !isShop;

  return <nav className="choiceBar profileTabs squadNav" aria-label="Разделы сквадов">
    <Link to="/squads" replace state={linkState} aria-current={isOverview ? 'page' : undefined}>
      <GameGlyph name="shield"/>Обзор и осада
    </Link>
    <Link to="/squads/war" replace state={linkState} aria-current={isWar ? 'page' : undefined}>
      <GameGlyph name="fight"/>Карта земель
    </Link>
    <Link to="/squads/shop" replace state={linkState} aria-current={isShop ? 'page' : undefined}>
      <GameGlyph name="shop"/>Магазин
    </Link>
  </nav>;
}

function SiegePowerCalculatorCard() {
  const [rawSp, setRawSp] = useState('5684');
  const numericSp = Math.max(0, Number(rawSp) || 0);
  const approxPower = Math.round(numericSp / 100);

  return <section className="card siegeCalcCard">
    <div className="mediaHeading">
      <GameArt path="/game/ui/fight-vs.png" size={42}/>
      <div>
        <h2>⚡ Калькулятор мощи осады</h2>
        <p>Мощь при осаде даёт заработанный <strong>SP</strong>, а не опыт (XP).</p>
      </div>
    </div>

    <div className="siegeCalcBody">
      <label className="siegeSpField">
        <span>Твой общий SP в игре</span>
        <div className="siegeSpInputRow">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={rawSp}
            onChange={event => setRawSp(event.target.value)}
            aria-label="Количество SP"
          />
          <span className="siegeSpUnit">SP</span>
        </div>
      </label>

      <div className="siegePowerOutput" aria-live="polite">
        <small>Ожидаемая мощь</small>
        <strong>⚔️ ~{approxPower.toLocaleString('ru-RU')} мощи</strong>
        <span>~1 мощь за 100 SP · точное число приходит с сервера</span>
      </div>
    </div>

    <div className="siegePresetRow" role="group" aria-label="Быстрые примеры SP">
      {spPresets.map(preset => <button
        key={preset}
        type="button"
        aria-pressed={numericSp === preset}
        onClick={() => setRawSp(String(preset))}
      >{preset.toLocaleString('ru-RU')} SP</button>)}
    </div>

    <div className="siegeTipsGrid">
      <div className="siegeTipTile">
        <strong>🥊 Чучело в Додзё</strong>
        <p>Удары и особенно навыки по чучелу приносят больше SP и быстрее растят мощь.</p>
      </div>
      <div className="siegeTipTile">
        <strong>🔋 Остаток не сгорает</strong>
        <p>Доступная = Общая − Вложенная. Неиспользованный запас переходит между раундами.</p>
      </div>
    </div>
  </section>;
}

function SiegePhasesCard({ onChatVisit }: { onChatVisit?: () => void }) {
  const [stage, setStage] = useState<WarStageId>('capture');
  const activeStage = warStages.find(item => item.id === stage) ?? warStages[0];

  return <section className="card siegeRulesCard" id="siege-rewards">
    <div className="siegeSectionHead">
      <h2>⚔️ Как проходит война (3 × 8 ч)</h2>
      <p>Выбери этап, чтобы понять правила захвата, цепочек и сбора наград.</p>
    </div>

    <div className="siegeTimelineStrip" aria-hidden="true">
      <span className={stage === 'capture' ? 'isActive' : ''}>⏱️ Раунд 1 · 8ч</span>
      <span className="timelineArrow">→</span>
      <span className={stage === 'chain' ? 'isActive' : ''}>⏱️ Раунд 2 · 8ч</span>
      <span className="timelineArrow">→</span>
      <span className={stage === 'chain' ? 'isActive' : ''}>⏱️ Раунд 3 · 8ч</span>
      <span className="timelineArrow">→</span>
      <span className={stage === 'peace' ? 'isActive' : ''}>🕊️ Сбор</span>
    </div>

    <div className="siegeStageTabs" role="tablist" aria-label="Этапы осады">
      {warStages.map(item => <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={item.id === stage}
        onClick={() => setStage(item.id)}
      >{item.tab}</button>)}
    </div>

    <div className="siegeStagePanel" role="tabpanel">
      <h3>{activeStage.title}</h3>
      <ul className="siegeStageList">
        {activeStage.points.map(point => <li key={point.lead}>
          <span className="siegeStageIcon" aria-hidden="true">{point.icon}</span>
          <div>
            <strong>{point.lead}</strong>
            <p>{point.text}</p>
          </div>
        </li>)}
      </ul>
    </div>

    <a className="secondary siegeChatBtn" href={communityChat} onClick={() => { onChatVisit?.(); trackGuide('action:chat'); }}>
      <GameGlyph name="chat"/>Чат для планирования осад
    </a>
  </section>;
}

function RitualCard() {
  const [percent, setPercent] = useState(50);
  const activated = percent >= 50;

  return <section className="card ritualCard">
    <div className="mediaHeading">
      <GameArt path="/game/items/lighter.webp" size={46}/>
      <div>
        <h2>🕯️ Ежедневный ритуал и задания</h2>
        <p>Общий бафф дня на 24 часа для всего сквада.</p>
      </div>
    </div>

    <div className="ritualStatsRow">
      <div><span>Зажигалка</span><strong><Price value={2500} currency="squad_silver"/></strong></div>
      <div><span>Ресурс</span><strong>🔥 10 зарядов</strong></div>
      <div><span>1 ритуал</span><strong>250 🥈 / день</strong></div>
    </div>

    <div className="ritualMeterBox">
      <div className="ritualMeterHead">
        <span>Активность сквада сегодня: <b>{percent}%</b></span>
        <span className={`ritualStatus ${activated ? 'isReady' : 'isPending'}`}>
          {activated ? '✨ Бафф на 24 ч активен!' : '⏳ Нужен порог 50%'}
        </span>
      </div>
      <div className="ritualProgressTrack" aria-hidden="true">
        <div className={`ritualProgressFill ${activated ? 'isReady' : ''}`} style={{ width: `${percent}%` }}/>
        <span className="ritualThresholdMark" style={{ left: '50%' }} title="Порог 50%"/>
      </div>
      <div className="ritualPresetBar" role="group" aria-label="Симулятор прогресса ритуала">
        {ritualPresets.map(val => <button
          key={val}
          type="button"
          aria-pressed={percent === val}
          onClick={() => setPercent(val)}
        >{val}%</button>)}
      </div>
    </div>

    <div className="ritualNotes">
      <p>📜 <b>Клановые задания:</b> обновляются каждый день прямо на экране ритуала.</p>
      <p>🏆 <b>Достижения:</b> игра считает серию ежедневных ритуалов и <b>7 раундов</b> осады (серия осад).</p>
    </div>

    <DetailLink className="secondary ritualShopLink" to="/squads/shop">
      <GameGlyph name="shop"/>Открыть магазин сквада (Зажигалка и свитки)
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
      <SiegePowerCalculatorCard/>
      <SiegePhasesCard onChatVisit={onChatVisit}/>
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
      <p className="squadIntroLead">Вступление в сквад — с <strong>3-го уровня</strong>, участие в войнах — с <strong>4-го</strong>.</p>
      <div className="squadKpiGrid">
        <div className="squadKpiTile">
          <span>⏱️ Длительность</span>
          <strong>3 раунда × 8 ч</strong>
          <small>затем мирная фаза сбора</small>
        </div>
        <div className="squadKpiTile">
          <span>⚡ Что даёт мощь</span>
          <strong>Заработанный SP</strong>
          <small>~1 мощь за 100 SP (не XP)</small>
        </div>
        <div className="squadKpiTile">
          <span>🎯 Условие доли</span>
          <strong>От 1 мощи</strong>
          <small>личного вклада в раунде</small>
        </div>
        <div className="squadKpiTile">
          <span>🕯️ Бафф дня</span>
          <strong>50% сквада</strong>
          <small>действует ровно 24 часа</small>
        </div>
      </div>
    </section>

    <SiegePowerCalculatorCard/>
    <SquadMap/>
    <SiegePhasesCard onChatVisit={onChatVisit}/>
    <RitualCard/>
  </>;
}
