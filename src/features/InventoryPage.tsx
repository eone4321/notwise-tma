import { DetailLink } from '../ui/DetailLink';
import { useCallback, useId, useState } from 'react';
import { collectionMarket, itemMarket } from './marketData';
import publishing from '../domain/game-publishing.json';
import mintableItems from './mintable-items.json';
import { Link, useLocation } from 'react-router';
import { GameGlyph } from '../ui/GameGlyph';
import { GameSymbol } from '../ui/GameSymbol';
import { GameArt } from '../ui/GameArt';
import { MemoCard } from '../ui/MemoCard';
import { chanceLabel, chancePerOpening } from '../domain/mechanics';
import { dropsFor, eggDrawCounts, itemNames, itemNamesEn } from './inventory';
import marketCollections from './market-collections';
import { OwlPrices } from './OwlPrices';
import { Price, type Currency } from './Price';
import { GramEstimate, StarsAndGram } from './GamePrice';
import { ItemHelp } from './ItemHelp';
import { ringCatalog } from './combat-builds';
import shopItems from './shop-data.json';
import { SkinFarmCalculator } from './SkinFarmCalculator';
import { matchingJetton, type SkinSelection } from './skinRig';
import { ModesPage } from './CombatPage';
import { ItemValueRankingPage, LifehacksPage } from './LifehacksPage';
import { itemCollectionMarketUrl } from '../domain/item-market-links';
import { useGuideLocale } from './guideLocale';

const eggs = [
  {
    id: 17, slug: 'mystery', file: 'egg.webp',
    name: 'Загадочное яйцо', nameEn: 'Mysterious Egg',
    note: 'Также выпадает из капсул', noteEn: 'Also drops from capsules',
    source: 'Лавка или капсулы', sourceEn: 'Shop or capsules',
    reward: 'Еда, лекарства, оформление, скин-жетон и Чиллер.',
    rewardEn: 'Food, medicine, decorations, skin jetton, and Chiller.',
  },
  {
    id: 56, slug: 'season', file: 'egg-stars.webp',
    name: 'Загадочное яйцо', nameEn: 'Mysterious Egg',
    note: 'Может дать заточки', noteEn: 'Can drop enchanters',
    source: 'Лавка, крафт или награда сезона', sourceEn: 'Shop, craft, or season reward',
    reward: 'Из яйца могут выпасть заточки кольца и скина. По базовым правилам сезона его получают игроки с 11-го по 100-е место.',
    rewardEn: 'Can drop ring and skin enchanters. Awarded to places 11–100 in seasonal tournaments.',
    shards: 3000,
  },
  {
    id: 19, slug: 'red', file: 'golden-egg.webp',
    name: 'Золотое загадочное яйцо', nameEn: 'Golden Mysterious Egg',
    note: 'Может дать эпический скин-жетон', noteEn: 'Can drop epic skin jetton',
    source: 'Лавка, крафт или награда сезона', sourceEn: 'Shop, craft, or season reward',
    reward: 'Из яйца могут выпасть скин-жетон, эпический скин-жетон и заточки. По базовым правилам сезона его получают игроки из первой десятки.',
    rewardEn: 'Can drop skin jettons, epic skin jettons, and enchanters. Awarded to the top 10 in seasonal tournaments.',
    shards: 15000,
  },
  {
    id: 61, slug: 'referral', file: 'referral-egg.webp',
    name: 'Реферальное яйцо', nameEn: 'Referral Egg',
    note: 'За вход по ссылке друга', noteEn: 'For joining via a friend’s link',
    source: 'Вход по ссылке друга', sourceEn: 'Joining via referral link',
    reward: 'Приглашённый получает яйцо и 5 000 монет. У яйца тот же набор наград и шансов, что у загадочного за монеты.',
    rewardEn: 'The invited player receives this egg and 5,000 coins. Shares the same loot pool and odds as the coin Mysterious Egg.',
  },
  {
    id: 18, slug: 'green', file: '18.png',
    name: 'Особое загадочное яйцо', nameEn: 'Special Mysterious Egg',
    note: 'Заточки и эпический скин-жетон', noteEn: 'Enchanters & epic skin jetton',
    source: 'Способ получения сейчас неизвестен', sourceEn: 'Acquisition method currently unknown',
    reward: 'Может дать оформление, заточки и эпический скин-жетон.',
    rewardEn: 'Can drop decorations, enchanters, and an epic skin jetton.',
  },
  {
    id: 20, slug: 'gold', file: '20.png',
    name: 'Особое золотое яйцо', nameEn: 'Special Golden Egg',
    note: 'Заточки и золотой скин-жетон', noteEn: 'Enchanters & golden skin jetton',
    source: 'Способ получения сейчас неизвестен', sourceEn: 'Acquisition method currently unknown',
    reward: 'Может дать оформление, заточки и золотой скин-жетон.',
    rewardEn: 'Can drop decorations, enchanters, and a golden skin jetton.',
  },
] as const;

type Egg = typeof eggs[number];

const marketEggs = marketCollections.find(item => item.id === 'eggs')!;
const itemMintGram: Readonly<Partial<Record<number, number>>> = publishing.itemMintGram;

export function OwlPage() {
  const { pathname } = useLocation();
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const [, , slug, extra] = pathname.split('/');
  const egg = !extra ? eggs.find(item => pathname === '/owl/' + item.slug) : undefined;
  const drops = egg ? dropsFor(egg.id) : [];
  const shopPrice = egg && eggPrice(egg, 'shop');
  const unknownChance = drops.reduce((sum, [id, chance]) => sum + (itemNames[id] ? 0 : chance), 0);
  const isEggIndex = ['/owl', '/owl/shop', '/owl/loot'].includes(pathname);
  const isSkins = pathname === '/owl/skins';
  const isNotFound = !egg && !isEggIndex && !isSkins;
  return <>
    {!egg && !isNotFound && <nav className="choiceBar profileTabs owlTabs" aria-label={en ? 'Eggs and skins' : 'Яйца и скины'}>
      <Link to="/owl" replace aria-current={isEggIndex ? 'page' : undefined}><GameArt path="/game/items/egg.webp" size={16}/>{en ? 'Eggs' : 'Яйца'}</Link>
      <Link to="/owl/skins" replace aria-current={slug === 'skins' ? 'page' : undefined}><GameGlyph name="skin"/>{en ? 'Skins & Jettons' : 'Скины и жетоны'}</Link>
    </nav>}
    {isNotFound && <section className="card">
      <h2>{en ? 'Page not found' : 'Страница не найдена'}</h2>
      <Link className="textLink" to="/owl" replace>{en ? 'All eggs' : 'Все яйца'}</Link>
    </section>}
    {isEggIndex && <>
      <section className="card leanList eggSources">
        <h2>{en ? 'Shop' : 'Лавка'}</h2>
        {eggs.slice(0, 3).map(egg => <EggLink key={egg.id} egg={egg} method="shop" en={en}/>)}
      </section>
      <section className="card leanList eggSources" id="shards">
        <h2>{en ? 'Craft with Shards' : 'Крафт за осколки скорлупы'}</h2>
        <p className="caption">{en ? 'Crafting and buying the same egg yield identical drops.' : 'Крафт и покупка одного яйца дают одинаковый дроп.'}</p>
        {eggs.filter(egg => 'shards' in egg).map(egg => <EggLink key={egg.id} egg={egg} method="craft" en={en}/>)}
      </section>
      <section className="card leanList eggSources">
        <h2>{en ? 'From Referral' : 'За приглашение'}</h2>
        <EggLink egg={eggs[3]} en={en}/>
      </section>
      <section className="card eggSources">
        <h2>{en ? 'Other Eggs' : 'Другие яйца'}</h2>
        <details className="mediaDetails guideDisclosure">
          <summary><GameArt path={itemPath('18.png')} size={34}/>
            <span><strong>{en ? 'Special Eggs' : 'Особые яйца'}</strong><small>{en ? 'Epic and golden skin jettons' : 'Эпический и золотой скин-жетоны'}</small></span></summary>
          <p>{en ? 'Loot tables are known for both eggs. Their acquisition method in the current season is not yet confirmed.' : 'Для обоих яиц известны награды. Способ получения в текущем сезоне пока не подтверждён.'}</p>
          {eggs.slice(4).map(egg => <EggLink key={egg.id} egg={egg} en={en}/>)}
        </details>
        <details className="mediaDetails guideDisclosure">
          <summary><GameArt path="/brand/collections/eggs.png" size={34}/>
            <span><strong>{en ? 'NFT Eggs & Lottoque Trays' : 'NFT-яйца и лотки Lottoque'}</strong><small>{en ? 'Collections on Getgems' : 'Коллекции на Getgems'}</small></span></summary>
          <p>{en ? 'Previously, burning NOT Wise Eggs granted in-game eggs. In 2024, Lottoque promised 10 special golden eggs.' : 'Раньше сжигание NOT Wise Eggs давало игровые яйца. В 2024 году за Lottoque обещали 10 особых золотых яиц.'}</p>
          <p>{en ? 'Redemption availability is currently unconfirmed.' : 'Доступность обмена сейчас не подтверждена.'}</p>
          <DetailLink className="textLink" to="/collections/market#eggs">{en ? 'NFT Egg floor' : 'Флор NFT-яиц'}</DetailLink>
          <a className="textLink spacedLink" href={`https://getgems.io/collection/${marketEggs.address}`} target="_blank" rel="noreferrer">{en ? 'NFT Eggs' : 'NFT-яйца'}</a>
          <a className="textLink spacedLink" href="https://getgems.io/lottoque" target="_blank" rel="noreferrer">Lottoque</a>
        </details>
      </section>
    </>}
    {pathname === '/owl/skins' && <SkinCatalog/>}
    {egg && <section className="card">
      <div className="mediaHeading"><GameArt path={itemPath(egg.file)} size={64}/>
        <div><h2>{en ? egg.nameEn : egg.name}</h2><p>{en ? egg.sourceEn : egg.source}</p></div>
      </div>
      {shopPrice && <div className="eggDetailPrices">
        <span>{en ? 'In Shop ' : 'В Лавке '}{shopPrice.currency === 'stars' ? <StarsAndGram stars={shopPrice.value}/> : <Price value={shopPrice.value} currency={shopPrice.currency}/>}</span>
        {'shards' in egg && <span>{en ? 'With Shards ' : 'За осколки скорлупы '}<Price value={egg.shards} currency="shards"/></span>}
      </div>}
      <p>{en ? egg.rewardEn : egg.reward}</p>
      {egg.slug === 'referral' && (
        <p><DetailLink className="textLink" to="/referrals">{en ? 'How to invite friends and claim rewards' : 'Как пригласить друзей и получить награды'}</DetailLink></p>
      )}
      <h3>{en ? 'Chance per Opening' : 'Шанс за открытие'}</h3>
      <p className="caption">
        {en
          ? 'Chance to receive the reward at least once. Each opening rolls 1 item 80% of the time, 2 items 15%, and 3 items 5%.'
          : 'Шанс получить награду хотя бы раз. За открытие выпадает 1 предмет в 80% случаев, 2 — в 15%, 3 — в 5%.'}
      </p>
      <ul className="compactList lootList">
        {drops.filter(([id]) => itemNames[id]).sort((a, b) => b[1] - a[1]).map(([id, chance]) => {
          const [nameRu, file] = itemNames[id];
          const name = en ? (itemNamesEn[id] ?? nameRu) : nameRu;
          const target = lootDestination(id, file);
          const row = (
            <>
              <GameArt path={itemPath(file)} size={36}/>
              <span className="lootItemName">{name}</span>
              <span className="rowEnd lootRowEnd">
                <strong className="lootChancePercent">{chanceLabel(chancePerOpening(chance, eggDrawCounts), en)}</strong>
                {target && <span className="rowChevron" aria-hidden="true"/>}
              </span>
            </>
          );
          return <li key={id}>{target
            ? <DetailLink className="mediaRow" to={target}>{row}</DetailLink>
            : <div className="mediaRow">{row}</div>}</li>;
        })}
        {unknownChance > 0 && <li className="mediaRow">
          <span>{en ? 'Other rare rewards' : 'Другие редкие награды'}</span><strong>{chanceLabel(chancePerOpening(unknownChance, eggDrawCounts), en)}</strong>
        </li>}
      </ul>
      <details><summary>{en ? 'Why doesn’t probability guarantee a drop?' : 'Почему шанс не гарантирует награду?'}</summary>
        <p>{en ? 'Every opening is independent. “1 in 100” is the average frequency over many attempts—a reward can drop twice in a row or take longer to appear.' : 'Каждое открытие независимо. «1 из 100» — средняя частота выпадения за много попыток. Награда может выпасть дважды подряд или долго не выпадать.'}</p>
      </details>

    </section>}
  </>;
}

const energyTiers = [
  { range: ['Ур. 0–4', 'Lv. 0–4'], fight: 10, flight: 200, sp: '2–4 SP' },
  { range: ['Ур. 5–9', 'Lv. 5–9'], fight: 20, flight: 250, sp: '5–9 SP' },
  { range: ['Ур. 10–14', 'Lv. 10–14'], fight: 30, flight: 300, sp: '10–14 SP' },
  { range: ['Ур. 15–19', 'Lv. 15–19'], fight: 40, flight: 350, sp: '15–19 SP' },
  { range: ['Ур. 20–24', 'Lv. 20–24'], fight: 50, flight: 400, sp: '20–24 SP' },
  { range: ['Ур. 25–29', 'Lv. 25–29'], fight: 60, flight: 450, sp: '25–29 SP' },
  { range: ['Ур. 30–34', 'Lv. 30–34'], fight: 70, flight: 500, sp: '30–34 SP' },
  { range: ['Ур. 35–39', 'Lv. 35–39'], fight: 80, flight: 550, sp: '35–39 SP' },
  { range: ['Ур. 40–44', 'Lv. 40–44'], fight: 90, flight: 600, sp: '40–44 SP' },
] as const;

function ResourcesPage({ en }: { en: boolean }) {
  const lang = en ? 1 : 0;
  const resources = [
    {
      id: 'care-xp',
      title: ['XP · Опыт', 'XP · Experience'],
      subtitle: ['Источники, множители и сброс через дискету', 'Sources, multipliers & XP Floppy reset'],
      factors: ['От чего зависит награда XP', 'What changes XP rewards'],
      summary: ['Повышает уровень совы. На 2-м открываются навыки и Додзё, на 3-м — сквады, на 4-м — осады, на 5-м — полёт и задания. Уровень также повышает базовое здоровье и урон. Запись в дискету требует вдвое больше XP, чем она вмещает, и сбрасывает опыт, SP и навыки, возвращая сову в яйцо.', 'Raises your owl’s level. Skills and the Dojo unlock at level 2, squads at 3, sieges at 4, and flights and tasks at 5. Level also raises base health and damage. Filling a floppy requires twice the XP it holds and resets XP, SP, and skills, returning the owl to an egg.'],
      icon: <GameSymbol name="xp" size={24}/>,
      sources: ['Капсулы, полёты и верные ответы в Книге загадок. Опыт также можно получить из заполненной дискеты XP.', 'Capsules, flights, and correct answers in the Book of Riddles. You can also gain XP by using a filled XP Floppy.'],
      tip: ['В капсулах опыт зависит от уровня и типа капсулы. В Книге загадок серия верных ответов увеличивает XP до ×3. Голод режет получаемый опыт вдвое. Открытый Чиллер убирает XP из капсул, сохраняя монеты и предметы.', 'Capsule XP depends on the capsule’s level and type. A correct-answer streak in the Book of Riddles multiplies XP by up to ×3. Hunger halves earned XP. An open Chiller removes capsule XP while preserving coins and items.'],
      links: [['/combat/stats#xp', 'Опыт для уровней', 'XP by level'], ['/capsules', 'Награды капсул', 'Capsule rewards']],
    },
    {
      id: 'care-sp',
      title: ['SP · Очки навыков', 'SP · Skill points'],
      subtitle: ['Фарм в Додзё, прокачка и мощь в осадах', 'Dojo farming, upgrades & siege power'],
      factors: ['Сколько SP даёт удар', 'SP per hit'],
      siege: ['Личная мощь в осадах растёт с заработанными SP. Мощь вкладывают в атаку или защиту территории. Учитываются заработанные очки, а не текущий остаток SP.', 'Personal siege power grows with earned SP. Commit that power to attack or defend a territory. Total SP earned matters, regardless of your unspent SP balance.'],
      summary: ['Трать SP на уровни уже открытых навыков, запас энергии и восстановление энергии и здоровья. Свободные SP можно записать в колбу для переноса. Для заполнения нужно вдвое больше SP, чем вмещает колба, и списывается весь свободный остаток.', 'Spend SP on unlocked skill levels, energy capacity, and energy and health regeneration. A flask lets you transfer SP. Filling it requires twice its capacity and spends your entire unallocated balance.'],
      icon: <GameSymbol name="sp" size={24}/>,
      sources: ['Додзё открывается со 2-го уровня. Удар по манекену стоит 2⚡ и даёт SP по уровню совы. На 10-м уровне это 10 SP за обычный удар. SP также дают за бои. Заполненная колба позволяет перенести ранее накопленные очки.', 'The Dojo opens at level 2. A hit costs 2⚡ and gives SP equal to your owl’s level. At level 10, that is 10 SP per normal hit. Battles also award SP. A filled flask lets you transfer previously stored points.'],
      tip: ['Чем выше уровень совы, тем больше SP за удар. Удар Bang удваивает награду. Новый навык открывается за очки атрибутов в его ветке, а SP идут на его улучшение.', 'Higher owl levels give more SP per hit. A Bang hit doubles the reward. Attribute points unlock skills in their branches, and SP upgrade them.'],
      links: [['/combat', 'Открытие и прокачка навыков', 'Unlocking and upgrading skills'], ['/squads/war', 'Мощь в осадах', 'Siege power']],
    },
    {
      id: 'care-coins',
      title: ['Монеты', 'Coins'],
      subtitle: ['Источники дохода, множители и защита баланса', 'Income sources, multipliers & raid defense'],
      factors: ['Бонусы и штрафы к монетам', 'Coin bonuses and penalties'],
      summary: ['Ими платят в игровой лавке за еду, лекарства и экипировку.', 'Spend them in the in-game shop on food, medicine, and gear.'],
      icon: <GameArt path={itemPath('wise-coin.webp')} size={30}/>,
      sources: ['Капсулы, полёты, нападения, Книга загадок, удержание территорий в осадах и награды за приглашения. Победитель нападения забирает 3% монет проигравшего.', 'Capsules, flights, raids, the Book of Riddles, holding territories in sieges, and referral rewards. The winner of a raid takes 3% of the loser’s coins.'],
      tip: ['Скин, заточка, боевая лига и Монтмориллонит повышают доход от боёв и полётов. Серия ответов в Книге даёт до ×3 монет, а голод режет доход вдвое. Бонусы экипировки не увеличивают фиксированную награду капсул.', 'Skins, enchants, battle league, and Montmorillonite boost coins from battles and flights. Riddle streaks multiply coins by up to ×3, and hunger halves income. Equipment bonuses do not boost fixed capsule rewards.'],
      links: [['/owl/skins', 'Калькулятор бонуса к монетам', 'Coin bonus calculator'], ['/modes#leagues', 'Бонусы лиг', 'League bonuses'], ['/assets', 'Цены в лавке', 'Shop prices']],
    },
  ];
  return <>
    {resources.map(resource => (
      <MemoCard
        key={resource.id}
        id={resource.id}
        icon={resource.icon}
        title={resource.title[lang]}
        meta={<p>{resource.subtitle[lang]}</p>}
        links={resource.links.map(([to, ru, english]) => ({ to, label: en ? english : ru }))}
      >
        <div className="resourceSections">
          <section>
            <h3>{en ? 'Where to earn it' : 'Где получить'}</h3>
            <p>{resource.sources[lang]}</p>
          </section>
          <section>
            <h3>{resource.factors[lang]}</h3>
            <p>{resource.tip[lang]}</p>
          </section>
          <section>
            <h3>{en ? 'What it is for' : 'Для чего нужно'}</h3>
            <p>{resource.summary[lang]}</p>
            {resource.siege && <p>{resource.siege[lang]}</p>}
          </section>
        </div>
      </MemoCard>
    ))}
  </>;
}

export function CarePage() {
  const { pathname, state } = useLocation();
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const keepParent = state?.guideDetail === true;
  const tabState = keepParent ? { guideDetail: true } : undefined;
  const isModes = pathname === '/modes';
  const isLifehacks = pathname === '/lifehacks';
  const isValues = pathname === '/item-values';

  return <>
    <div className="careTabsViewport">
      <div className="careTabsViewportInner">
        <nav className="choiceBar profileTabs careTabs careTabsScroll" aria-label={en ? 'Guide sections' : 'Разделы памятки'}>
          <Link to="/care" replace state={tabState} aria-current={!isModes && !isLifehacks && !isValues ? 'page' : undefined}>
            <GameGlyph name="info"/>{en ? 'Memo' : 'Памятка'}
          </Link>
          <Link to="/modes" replace state={tabState} aria-current={isModes ? 'page' : undefined}>
            <GameGlyph name="fight"/>{en ? 'Modes' : 'Режимы'}
          </Link>
          <Link to="/lifehacks" replace state={tabState} aria-current={isLifehacks ? 'page' : undefined}>
            <GameGlyph name="sparkles"/>{en ? 'Lifehacks' : 'Лайфхаки'}
          </Link>
          <Link to="/item-values" replace state={tabState} aria-current={isValues ? 'page' : undefined}>
            <GameGlyph name="treasure"/>{en ? 'Item Value' : 'Ценность'}
          </Link>
        </nav>
      </div>
    </div>

    {isModes ? <ModesPage/> : isLifehacks ? <LifehacksPage/> : isValues ? <ItemValueRankingPage/> : <div className="memoStack">
      <ResourcesPage en={en}/>
      <MemoCard
        id="care-daily"
        icon={<GameArt path={itemPath('book.webp')} size={30}/>}
        title={en ? 'Daily Cycle & Owl Care' : 'Ежедневный цикл и уход'}
        meta={<p>{en ? 'Key timers, resets, and base vitals' : 'Ключевые таймеры, сбросы и базовые параметры'}</p>}
        links={[{ to: '/assets/care', label: en ? 'All food and medicine' : 'Вся еда и лекарства' }]}
      >
        <div className="memoRows">
          <div className="memoRow">
            <span className="memoRowIcon"><GameArt path={itemPath('lighter.webp')} size={26}/></span>
            <div>
              <strong>{en ? 'Daily Resets at 00:00 UTC' : 'Сбросы в 00:00 UTC'}</strong>
              <div className="memoLines">
                <p>{en ? 'Free full energy refill.' : 'Бесплатное полное восстановление энергии.'}</p>
                <p>{en ? '3 free revive rockets for flights.' : '3 бесплатные ракеты для полёта.'}</p>
                <p>{en ? 'Explorer Book riddle — up to 3× streak and +5 Wisdom for 24h.' : 'Загадка книги — до ×3 за серию и +5 мудрости на 24ч.'}</p>
                <p>{en ? 'Daily squad ritual.' : 'Ежедневный ритуал сквада.'}</p>
              </div>
            </div>
          </div>
          <div className="memoRow">
            <span className="memoRowIcon"><GameArt path={itemPath('croissant.webp')} size={26}/></span>
            <div>
              <strong>{en ? 'Satiety — Every 3 Days' : 'Сытость — раз в 3 дня'}</strong>
              <div className="memoLines">
                <p>{en ? 'Max 20; keep above 0 with food. Flights require Happiness ≥ 10 instead.' : 'Максимум 20; поддерживай едой. Для полёта нужно Счастье ≥ 10.'}</p>
                <p>{en ? 'Favorite food grants 2× satiety.' : 'Любимая еда даёт ×2 сытости.'}</p>
                <p>{en ? 'No food for 3 days triggers a 24h penalty: 0.5× coins & XP, and 2× slower HP/energy regen.' : 'Без еды 3 дня — штраф на 24ч: монеты и опыт ×0.5, реген HP и энергии в 2 раза медленнее.'}</p>
              </div>
            </div>
          </div>
          <div className="memoRow">
            <span className="memoRowIcon"><GameSymbol name="heart" size={26}/></span>
            <div>
              <strong>{en ? 'Happiness — Flights & HP Regen' : 'Счастье — полёты и реген HP'}</strong>
              <div className="memoLines">
                <p>{en ? 'Flights require Happiness ≥ 10 (otherwise: “Your owl is too sad to fly”).' : 'Для полёта нужно Счастье ≥ 10 (иначе: «Сова слишком грустит, чтобы лететь»).'}</p>
                <p>{en ? 'Higher happiness also speeds up passive health regeneration.' : 'Чем выше счастье, тем быстрее пассивная регенерация HP.'}</p>
              </div>
            </div>
          </div>
          <div className="memoRow">
            <span className="memoRowIcon"><GameArt path={itemPath('big-black-clock.webp')} size={26}/></span>
            <div>
              <strong>{en ? 'Energy Reserve & Regen' : 'Запас и реген энергии'}</strong>
              <div className="memoLines">
                <p>{en ? 'Base: 100 ⚡ and 80 ⚡/h regen (1 ⚡ per 45s).' : 'База: 100 ⚡ и реген 80 ⚡/ч (1 ⚡ за 45с).'}</p>
                <p>{en ? 'Wisdom perk adds +100 ⚡ reserve per level (up to 2,200 ⚡).' : 'Перк Мудрости даёт +100 ⚡ к запасу за уровень (до 2 200 ⚡).'}</p>
                <p>{en ? 'Agility perk speeds up regen by +3% per level (up to 130 ⚡/h).' : 'Перк Ловкости ускоряет реген на +3% за уровень (до 130 ⚡/ч).'}</p>
              </div>
            </div>
          </div>
        </div>
      </MemoCard>

      <MemoCard
        id="care-energy"
        icon={<GameArt path={itemPath('chiller-open.webp')} size={30}/>}
        title={en ? 'Battle, Flight & SP Farm Costs' : 'Стоимость боя, полёта и фарма SP'}
        meta={<p>{en ? 'Battles add +10 ⚡ every 5 levels; flights add +50 ⚡' : 'Бой растёт на +10 ⚡ каждые 5 уровней, полёт — на +50 ⚡'}</p>}
      >
        <div className="energyGradTable" role="table" aria-label={en ? 'Battle, flight, and SP farm costs by level' : 'Стоимость боя, полёта и фарма SP по уровням'}>
          <div className="energyGradHead" role="row">
            <span role="columnheader">{en ? 'Level' : 'Уровень'}</span>
            <span role="columnheader">{en ? 'Battle' : 'Бой'}</span>
            <span role="columnheader">{en ? 'Flight' : 'Полёт'}</span>
            <span role="columnheader">{en ? 'SP Farm' : 'Фарм SP'}</span>
          </div>
          {energyTiers.map(tier => (
            <div className="energyGradRow" role="row" key={tier.range[0]}>
              <strong role="cell">{en ? tier.range[1] : tier.range[0]}</strong>
              <span role="cell" className="isGold">{tier.fight} ⚡</span>
              <span role="cell">{tier.flight} ⚡</span>
              <span role="cell" className="isSp">{tier.sp}</span>
            </div>
          ))}
        </div>

        <div className="memoNote">
          <div className="memoLines">
            {en ? (
              <>
                <p>In the Dojo (from Lv. 2), each hit costs <b>2 ⚡</b> and pays <b>SP = your owl level</b> (<b>×2</b> on Bang crit).</p>
                <p>Higher levels earn more SP per hit in the Dojo, while battles and flights cost more energy.</p>
                <p>To keep battle costs low, open <b>Chiller</b> right before level cliffs (Lv. 4, 9, 14, 19).</p>
              </>
            ) : (
              <>
                <p>В Додзё (со 2-го ур.) удар стоит <b>2 ⚡</b> и даёт <b>SP = твой уровень</b> (крит Bang — <b>×2</b>).</p>
                <p>Чем выше уровень, тем больше SP с одного удара, но тем дороже бои и полёты.</p>
                <p>Если хочешь дёшево драться, включай <b>Чиллер</b> на границе ступеней (ур. 4, 9, 14, 19).</p>
              </>
            )}
          </div>
        </div>
      </MemoCard>

      <MemoCard
        id="care-combat"
        icon={<GameArt path={itemPath('ring-wit-3.webp')} size={30}/>}
        title={en ? 'Combat, Sieges & Defense' : 'Бой, осада и защита'}
        meta={<p>{en ? 'Stat caps, raid shields, and progression tools' : 'Ограничения статов, нападения и предметы прогресса'}</p>}
        links={[
          { to: '/lifehacks', label: en ? 'Game lifehacks' : 'Лайфхаки игры' },
          { to: '/item-values', label: en ? 'Item value ranking' : 'Рейтинг ценности предметов' },
          { to: '/combat/builds', label: en ? 'Build calculator' : 'Калькулятор билдов' },
        ]}
      >
        <div className="memoRows">
          <div className="memoRow">
            <span className="memoRowIcon"><GameArt path={itemPath('ring-ag-3.webp')} size={26}/></span>
            <div>
              <strong>{en ? '70% Stat Cap at 100 Points' : 'Потолок статов — 70% на 100 очках'}</strong>
              <div className="memoLines">
                <p>{en ? 'Dodge (Agility) and Crit (Wisdom) stop growing past 100 points.' : 'Выше 100 Ловкости (уклонение) и 100 Мудрости (крит) шансы не растут.'}</p>
                <p>{en ? 'Extra Wisdom above 100 only adds +20 mana per point.' : 'Лишняя Мудрость даёт только +20 маны за очко.'}</p>
                <p>{en ? 'Up to 3 skills can be equipped in battle; mana does not regenerate during a fight.' : 'В бой берётся до 3 навыков, мана за бой не восстанавливается.'}</p>
              </div>
            </div>
          </div>
          <div className="memoRow">
            <span className="memoRowIcon"><GameArt path={itemPath('seba-cola.webp')} size={26}/></span>
            <div>
              <strong>{en ? 'Raids & Balance Protection' : 'Нападения и защита баланса'}</strong>
              <div className="memoLines">
                <p>{en ? 'The raid winner takes 3% of the defender’s coins.' : 'Победитель нападения забирает 3% монет.'}</p>
                <p>{en ? 'Every fight grants a 5-minute post-battle respite.' : 'После любого боя действует передышка 5 минут.'}</p>
                <p>{en ? 'After 3 consecutive raid losses, a shield activates until you return to the game.' : 'После 3 проигранных защит подряд включается щит до входа в игру.'}</p>
                <p>{en ? 'Seba Cola grants a 24h shield (breaks immediately if you attack).' : 'Seba Cola даёт защитный купол на 24ч (спадает при твоей атаке).'}</p>
              </div>
            </div>
          </div>
          <div className="memoRow">
            <span className="memoRowIcon"><GameArt path={itemPath('morpher.webp')} size={26}/></span>
            <div>
              <strong>{en ? 'Respecs & Progress Transfer' : 'Сбросы и перенос прогресса'}</strong>
              <div className="memoLines">
                {en ? (
                  <>
                    <p><b>Chiller</b> — freezes capsule XP while keeping coins and loot.</p>
                    <p><b>Morpher</b> — resets stats and skills while keeping 100% of your SP.</p>
                    <p><b>Empty SP Flask</b> — bottles free SP into an NFT (50% tax).</p>
                    <p><b>Empty XP Floppy</b> — bottles XP before rebirth into an egg (50% tax).</p>
                  </>
                ) : (
                  <>
                    <p><b>Чиллер</b> — морозит опыт из капсул.</p>
                    <p><b>Морфер</b> — сбрасывает статы и навыки без потери SP.</p>
                    <p><b>Пустая фласка для SP</b> — записывает накопленные SP.</p>
                    <p><b>Пустая дискета XP</b> — сохраняет XP перед перерождением.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </MemoCard>
    </div>}
  </>;
}

function eggPrice(egg: Egg, method: 'shop' | 'craft'): CatalogItem['price'] {
  if (method === 'craft') return 'shards' in egg ? { value: egg.shards, currency: 'shards' } : undefined;
  const offer = shopItems.find(item => item.item_id === egg.id && item.category === 'egg');
  if (offer) return { value: offer.price, currency: offer.currency === 'stars' ? 'stars' : 'coins' };
}

function EggLink({ egg, method, en }: { egg: Egg; method?: 'shop' | 'craft'; en?: boolean }) {
  const price = method && eggPrice(egg, method);
  return <DetailLink to={'/owl/' + egg.slug} className="mediaRow eggLink" data-method={method}>
    <GameArt path={itemPath(egg.file)} size={38}/>
    <span className="eggRowText"><strong>{en ? egg.nameEn : egg.name}</strong>{method !== 'craft' && <small>{en ? egg.noteEn : egg.note}</small>}</span>
    <span className="rowEnd">
      {price && (price.currency === 'stars' ? <StarsAndGram stars={price.value}/> : <Price value={price.value} currency={price.currency}/>)}
      <span className="rowChevron" aria-hidden="true"/>
    </span>
  </DetailLink>;
}

const itemPath = (file: string) => '/game/items/' + file;
const skinsCollection = marketCollections.find(item => item.id === 'skins')!;
const itemsCollection = marketCollections.find(item => item.id === 'items')!;
const expCollection = marketCollections.find(item => item.id === 'exp') ?? itemsCollection;
const vouchersCollection = marketCollections.find(item => item.id === 'vouchers') ?? itemsCollection;

type CatalogItem = {
  name: string; nameEn?: string; file: string; effect: string; effectEn?: string; source: string; sourceEn?: string;
  offerId?: string;
  minLevel?: number;
  art?: string;
  marketAddress?: string;
  price?: { value: number; currency: Currency };
};
type Category = { title: string; titleEn: string; icon: string; summary: string; summaryEn: string; items: CatalogItem[] };

const jettons: (CatalogItem & { id: number })[] = [
  {
    id: 25, name: 'Скин-жетон', nameEn: 'Skin Jetton', file: 'skin-jetton.webp',
    effect: 'Даёт случайный скин с обычным оперением.', effectEn: 'Grants a random skin with common plumage.',
    source: 'Яйца', sourceEn: 'Eggs', marketAddress: itemsCollection.address,
  },
  {
    id: 26, name: 'Эпический скин-жетон', nameEn: 'Epic Skin Jetton', file: 'skin-jetton-epic.webp',
    effect: 'Даёт скин с оперением и несколькими аксессуарами.', effectEn: 'Grants a skin with plumage and multiple accessories.',
    source: 'Яйца', sourceEn: 'Eggs', marketAddress: itemsCollection.address,
  },
  {
    id: 27, name: 'Золотой скин-жетон', nameEn: 'Golden Skin Jetton', file: 'skin-jetton-golden.webp',
    effect: 'Гарантирует золотое оперение. Цепь NOT может выпасть среди аксессуаров.', effectEn: 'Guarantees golden plumage. NOT Chain can roll among accessories.',
    source: 'Яйца', sourceEn: 'Eggs', marketAddress: itemsCollection.address,
  },
];
const skinNft: CatalogItem = {
  name: 'Готовые NFT-скины', nameEn: 'Ready-made NFT Skins', file: 'owl-skin.webp', art: '/brand/collections/skins.png',
  effect: 'Выбери готовый облик с нужным оперением и аксессуарами.', effectEn: 'Pick a ready-made look with the exact plumage and accessories you want.',
  source: 'Коллекция NOT Wise Skins', sourceEn: 'NOT Wise Skins collection', marketAddress: skinsCollection.address,
};

const floppySpecs = [
  ['100k', '100 000', '200 000', '100,000', '200,000'],
  ['1m', '1 млн', '2 млн', '1M', '2M'],
  ['10m', '10 млн', '20 млн', '10M', '20M'],
  ['100m', '100 млн', '200 млн', '100M', '200M'],
  ['1b', '1 млрд', '2 млрд', '1B', '2B'],
] as const;

const ringTitleEn: Record<string, string> = {
  'ring-str-1': 'Wooden Ring of Strength',
  'ring-str-2': 'Obsidian Ring of Strength',
  'ring-str-3': 'Golden Ring of Strength',
  'ring-ag-1': 'Wooden Ring of Agility',
  'ring-ag-2': 'Obsidian Ring of Agility',
  'ring-ag-3': 'Golden Ring of Agility',
  'ring-wit-1': 'Wooden Ring of Wisdom',
  'ring-wit-2': 'Obsidian Ring of Wisdom',
  'ring-wit-3': 'Golden Ring of Wisdom',
};

const rings: CatalogItem[] = ringCatalog.map(ring => {
  const attributeRu = ring.attribute === 'strength' ? 'силе' : ring.attribute === 'agility' ? 'ловкости' : 'мудрости';
  const attributeEn = ring.attribute === 'strength' ? 'Strength' : ring.attribute === 'agility' ? 'Agility' : 'Wisdom';
  const effectRu = ring.attribute === 'strength' ? 'Усиливает обычные удары.' :
    ring.attribute === 'agility' ? 'Повышает шанс уклониться.' : 'Повышает шанс крита и запас маны.';
  const effectEn = ring.attribute === 'strength' ? 'Increases basic hit damage.' :
    ring.attribute === 'agility' ? 'Increases dodge chance.' : 'Increases crit chance and mana pool.';
  return {
    name: ring.title,
    nameEn: ringTitleEn[ring.id] ?? ring.title,
    file: ring.id + '.webp',
    effect: `+${ring.bonus} к ${attributeRu}. ${effectRu}`,
    effectEn: `+${ring.bonus} ${attributeEn}. ${effectEn}`,
    source: 'Лавка',
    sourceEn: 'Shop',
    minLevel: ring.minLevel,
  };
});

const categories: Record<string, Category> = {
  consumables: {
    title: 'Расходники', titleEn: 'Consumables', icon: 'seba-cola.webp',
    summary: 'Защита, сброс навыков и восстановление', summaryEn: 'Shields, skill respec, and recovery',
    items: [
      { name: 'Seba Cola', nameEn: 'Seba Cola', file: 'seba-cola.webp', effect: 'Защита от нападений и подбора соперником на 24ч. Снимается при твоём нападении.', effectEn: '24h protection from raids and matchmaking. Breaks if you attack.', source: 'Лавка', sourceEn: 'Shop', price: { value: 1500, currency: 'coins' } },
      { name: 'Зажигалка', nameEn: 'Lighter', file: 'lighter.webp', effect: '10 зарядов для ритуалов сквада.', effectEn: '10 charges for daily squad rituals.', source: 'Лавка или яйца', sourceEn: 'Shop or eggs', minLevel: 3 },
      { name: 'Большие чёрные часы', nameEn: 'Big Black Clock', file: 'big-black-clock.webp', minLevel: 7, effect: 'Добавляют 30 дней защиты от голода. Действующий штраф сохраняется до конца таймера.', effectEn: 'Adds 30 days of hunger protection. Does not clear an already active penalty.', source: 'Лавка', sourceEn: 'Shop', price: { value: 10000, currency: 'coins' } },
      { name: itemNames[38][0], nameEn: itemNamesEn[38], file: 'book.webp', effect: 'Загадка дня на 60с. Успех даёт монеты, XP и +5 мудрости на сутки. Три ошибки уничтожают книгу.', effectEn: 'Daily 60s riddle. Solving grants coins, XP, and +5 Wisdom for 24h. Three mistakes destroy the book.', source: 'Лавка', sourceEn: 'Shop', price: { value: 20000, currency: 'coins' } },
      { name: 'Чиллер', nameEn: 'Chiller', file: 'chiller.webp', minLevel: 4, effect: 'Пока дверца открыта, капсулы дают монеты и предметы, а опыт заморожен.', effectEn: 'While open, capsules still grant coins and items while XP gain is frozen.', source: 'Лавка', sourceEn: 'Shop', price: { value: 100000, currency: 'coins' } },
      { name: 'Морфер', nameEn: 'Morpher', file: 'morpher.webp', effect: 'Сбрасывает характеристики и навыки. Накопленные SP сохраняются. Также в каталоге есть бесплатный Free Morpher (id 98, с 5-го ур., не NFT, отсутствует в лавке).', effectEn: 'Resets attributes and skills while preserving 100% of your accumulated SP. Catalog also defines a non-NFT Free Morpher (id 98, Lv. 5+, not sold in shops).', source: 'Лавка', sourceEn: 'Shop', offerId: 'morpher-stars' },
      { name: 'Пустая фласка для SP', nameEn: 'Empty SP Flask', file: 'flask-empty.webp', effect: 'Нужна для записи SP. Потребуется вдвое больше SP, чем вмещает фласка. Все свободные SP списываются.', effectEn: 'Used to bottle SP. Requires 2× the flask capacity and drains all unspent free SP.', source: 'Лавка', sourceEn: 'Shop', price: { value: 500, currency: 'stars' } },
      { name: 'Пустая дискета XP', nameEn: 'Empty XP Floppy', file: 'floppy-empty.webp', effect: 'Нужна для записи XP. Запись сбрасывает XP, SP и навыки и возвращает сову в яйцо.', effectEn: 'Used to bottle XP. Recording resets XP, SP, and skills and returns the owl to an egg.', source: 'Лавка', sourceEn: 'Shop', price: { value: 500, currency: 'stars' } },
      { name: 'Таблетка восстановления', nameEn: 'Recovery Pill', file: 'recovery-pill.webp', effect: 'Снимает штраф голода и возвращает сытость до 20. Раз в 7 дней.', effectEn: 'Clears an active hunger penalty and restores satiety to 20. 7-day cooldown.', source: 'Лавка', sourceEn: 'Shop', price: { value: 300, currency: 'stars' } },
    ],
  },
  squad: {
    title: 'Лавка сквада', titleEn: 'Squad Shop', icon: 'morpher.webp',
    summary: 'Морфер, заточки и ритуалы', summaryEn: 'Morpher, enchanters, and rituals',
    items: [
      { name: 'Морфер', nameEn: 'Morpher', file: 'morpher.webp', effect: 'Сбрасывает характеристики и навыки. Накопленные SP сохраняются.', effectEn: 'Resets attributes and skills while preserving 100% of your accumulated SP.', source: 'Лавка сквада', sourceEn: 'Squad Shop', price: { value: 5000, currency: 'squad_silver' } },
      { name: 'Заточка кольца', nameEn: 'Ring Enchanter', file: 'scroll-enchant-ring.webp', minLevel: 5, effect: '+1 к атрибуту кольца и +5% к монетам за каждую ступень заточки.', effectEn: '+1 ring attribute and +5% coins per enchant level.', source: 'Лавка сквада', sourceEn: 'Squad Shop', price: { value: 500, currency: 'squad_silver' } },
      { name: 'Заточка скина', nameEn: 'Skin Enchanter', file: 'scroll-enchant-skin.webp', effect: '+5% к монетам за ступень заточки скина.', effectEn: '+5% coins per skin enchant level.', source: 'Лавка сквада', sourceEn: 'Squad Shop', price: { value: 5000, currency: 'squad_silver' } },
      { name: 'Зажигалка сквада', nameEn: 'Squad Lighter', file: 'lighter.webp', effect: 'Даёт заряд для ежедневного благословения сквада.', effectEn: 'Provides charges for daily squad blessing rituals.', source: 'Лавка сквада', sourceEn: 'Squad Shop', offerId: 'squad-lighter' },
      { name: 'Чиллер', nameEn: 'Chiller', file: 'chiller.webp', minLevel: 4, effect: 'Открой дверцу, чтобы заморозить опыт из капсул.', effectEn: 'Open the door to freeze XP from capsules.', source: 'Лавка сквада', sourceEn: 'Squad Shop', price: { value: 25000, currency: 'squad_silver' } },
      { name: 'Универсальная заточка', nameEn: 'Universal Enchanter', file: 'enchanter.webp', effect: 'Пока недоступна. Для заточки колец используй Заточку кольца.', effectEn: 'Currently unavailable. Use Ring Enchanter to sharpen rings.', source: 'Недоступна', sourceEn: 'Unavailable' },
    ],
  },
  gear: {
    title: 'Кольца и артефакты', titleEn: 'Rings & Artifacts', icon: 'ring-wit-3.webp',
    summary: 'Сила, ловкость, мудрость и здоровье', summaryEn: 'Strength, agility, wisdom, and full health',
    items: [
      ...rings,
      { name: 'Монтмориллонит', nameEn: 'Montmorillonite', file: 'montmorillonite.webp', effect: 'Удерживает здоровье полным и даёт +10% к монетам, пока экипирован.', effectEn: 'Keeps health permanently full and grants +10% coins while equipped.',
        source: 'Лавка или яйца', sourceEn: 'Shop or eggs', offerId: 'mana-crystal', price: { value: 999999, currency: 'coins' } },
    ],
  },
  skins: {
    title: 'Жетоны и скины', titleEn: 'Jettons & Skins', icon: 'skin-jetton-epic.webp',
    summary: 'Три жетона и готовые NFT-скины', summaryEn: 'Three skin jettons and ready-made NFT skins',
    items: [...jettons, skinNft],
  },
  care: {
    title: 'Еда и лекарства', titleEn: 'Food & Medicine', icon: 'croissant.webp',
    summary: 'Восстановление сытости и здоровья', summaryEn: 'Restoring satiety and health',
    items: [
      ...([[1, 5], [2, 5], [3, 5], [5, 10], [6, 10], [7, 20], [8, 20]] as const).map(([id, satiety]) => ({
        name: itemNames[id][0], nameEn: itemNamesEn[id], file: itemNames[id][1],
        effect: `+${satiety} к сытости.`, effectEn: `+${satiety} satiety.`,
        source: id >= 5 ? 'Лавка или яйца' : 'Лавка', sourceEn: id >= 5 ? 'Shop or eggs' : 'Shop',
        minLevel: id === 7 ? 5 : undefined,
      })),
      { name: 'Подорожник', nameEn: 'Plantain', file: 'plantain.webp', effect: '+1 к здоровью.', effectEn: '+1 health.', source: 'Лавка', sourceEn: 'Shop' },
      { name: 'Пластырь', nameEn: 'Patch', file: 'patch.webp', effect: '+20 к здоровью.', effectEn: '+20 health.', source: 'Лавка или яйца', sourceEn: 'Shop or eggs' },
      { name: 'Аптечка', nameEn: 'First Aid Kit', file: 'first-aid-kit.webp', effect: '+50 к здоровью.', effectEn: '+50 health.', source: 'Лавка или яйца', sourceEn: 'Shop or eggs', minLevel: 5 },
    ],
  },
  craft: {
    title: 'Крафт и накопления', titleEn: 'Crafting & Storage', icon: 'eggshell-shards-icon.webp',
    summary: 'Яйца, хранение XP и SP, ваучеры $NOT', summaryEn: 'Eggs, XP & SP storage, and $NOT vouchers',
    items: [
      { name: 'Осколки скорлупы', nameEn: 'Eggshell Shards', file: 'eggshell-shards-icon.webp', effect: 'На загадочное яйцо нужно 3 000 осколков, на золотое загадочное — 15 000.', effectEn: '3,000 shards craft a Mysterious Egg; 15,000 craft a Golden Mysterious Egg.', source: 'Яйца и капсулы', sourceEn: 'Eggs and capsules' },
      ...floppySpecs.map(([id, contentsRu, costRu, contentsEn, costEn]) => ({
        name: 'Дискета ' + contentsRu + ' XP', nameEn: 'Floppy ' + contentsEn + ' XP', file: 'floppy-' + id + '.webp',
        effect: `Для записи нужно ${costRu} XP. Запись сбрасывает XP, SP и навыки и возвращает сову в яйцо.`,
        effectEn: `Requires ${costEn} XP to record. Recording resets XP, SP, and skills and returns the owl to an egg.`,
        source: 'Из пустой дискеты', sourceEn: 'From Empty XP Floppy',
      })),
      { name: 'Фласка на 100 000 SP', nameEn: '100,000 SP Flask', file: 'flask-half.webp', effect: 'Для записи нужно 200 000 SP. При использовании даёт 100 000 SP.', effectEn: 'Requires 200,000 SP to fill. Grants 100,000 SP when consumed.', source: 'Из пустой фласки', sourceEn: 'From Empty SP Flask' },
      { name: 'Фласка на 1 000 000 SP', nameEn: '1,000,000 SP Flask', file: 'flask-full.webp', effect: 'Для записи нужно 2 000 000 SP. При использовании даёт 1 000 000 SP.', effectEn: 'Requires 2,000,000 SP to fill. Grants 1,000,000 SP when consumed.', source: 'Из пустой фласки', sourceEn: 'From Empty SP Flask' },
      ...([['10k', 10_000], ['100k', 100_000]] as const).map(([id, value]): CatalogItem => ({
        name: `Ваучер ${value.toLocaleString('ru-RU')} $NOT`, nameEn: `${value.toLocaleString('en-US')} $NOT Voucher`, file: `voucher-${id}.webp`,
        effect: 'Создаётся за $NOT с игрового баланса (минт с 10-го ур.).', effectEn: 'Minted from Lv. 10 using $NOT from your in-game balance.',
        source: 'Раздел «Ноткоины»', sourceEn: 'Notcoins section', price: { value, currency: 'not' },
      })),
    ],
  },
  decor: {
    title: 'Оформление', titleEn: 'Decorations', icon: 'birch.webp',
    summary: 'Гирлянды, деревья и фон совы', summaryEn: 'String lights, tree bark, and backgrounds',
    items: [
      { name: 'Цветная гирлянда', nameEn: 'Color String Lights', file: 'string-light-color.webp', effect: 'Включает разноцветные огни на дереве совы.', effectEn: 'Turns on colorful lights on the owl’s tree.', source: 'Яйца', sourceEn: 'Eggs' },
      { name: 'Гирлянда', nameEn: 'String Lights', file: 'string-lights.webp', effect: 'Включает белые огни на дереве совы.', effectEn: 'Turns on warm white lights on the owl’s tree.', source: 'Яйца', sourceEn: 'Eggs' },
      { name: 'Берёзовая ветка', nameEn: 'Birch Branch', file: 'birch.webp', effect: 'Превращает дерево в берёзу.', effectEn: 'Turns your tree into a birch.', source: 'Яйца', sourceEn: 'Eggs' },
      { name: 'Дубайский шоколад', nameEn: 'Dubai Chocolate', file: 'dubai-chocolate.webp', effect: 'Переносит гнездо совы на небоскрёб в Дубае.', effectEn: 'Moves the owl’s nest to a Dubai skyscraper.', source: 'Яйца', sourceEn: 'Eggs' },
      { name: 'Ветка Эмпайр-стейт', nameEn: 'Empire State Branch', file: 'new-york.webp', effect: 'Переносит гнездо совы на небоскрёб в Нью-Йорке.', effectEn: 'Moves the owl’s nest to a New York skyscraper.', source: 'Яйца', sourceEn: 'Eggs' },
    ],
  },
};

function lootDestination(id: number, file: string) {
  if ([25, 26, 27].includes(id)) return '/owl/skins#jetton-' + id;
  return Object.values(categories).some(category => category.items.some(item => item.file === file))
    ? '/assets/item/' + file.split('.')[0] : undefined;
}

function SkinCatalog() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const [matchedJettonId, setMatchedJettonId] = useState<25 | 26 | 27 | null>(null);
  const handleSelectionChange = useCallback((sel: SkinSelection) => {
    setMatchedJettonId(matchingJetton(sel).id);
  }, []);

  return <>
    <SkinFarmCalculator onSelectionChange={handleSelectionChange}/>
    <section className="card inventoryPanel skinJettons" id="skin-jettons" data-category="skins">
      <h2>{en ? 'How to Get a Skin' : 'Как получить скин'}</h2>
      <p className="caption">{en ? 'The jetton matching your selected look is highlighted in gold.' : 'Подходящий к выбранному образу жетон подсвечен золотой рамкой.'}</p>
      <ul className="compactList">
        {jettons.map(item => <InventoryRow item={item} key={item.file} id={'jetton-' + item.id} matched={matchedJettonId === item.id}/>)}
        <SkinCollectionRow/>
      </ul>
      <details className="mediaDetails skinRuleDisclosure" id="skin-farm-rules">
        <summary><GameArt path="/game/items/scroll-enchant-skin.webp" size={27}/><strong>{en ? 'How to Increase Coin Farm Bonus' : 'Как увеличить бонус к монетам'}</strong></summary>
        <p>{en ? 'Each standard trait adds +5%, golden plumage +15%, and NOT Chain +10%. Every enchant level adds another +5%.' : 'Обычная деталь даёт +5%, золотое оперение +15%, цепь NOT +10%. Каждый уровень заточки добавляет ещё +5%.'}</p>
        <p>{en ? 'Golden plumage, NOT Chain, eyes, glasses, and hat together grant +40% even before enchanting.' : 'Золотое оперение, цепь NOT, глаза, очки и убор вместе дают +40% даже без заточки.'}</p>
        <DetailLink to="/assets/gear" className="textLink">{en ? 'Enchant odds' : 'Шансы заточки'}</DetailLink>
      </details>
    </section>
  </>;
}

function SkinCollectionRow() {
  const { data } = collectionMarket.useSnapshot();
  const quote = data?.items.find(entry => entry.id === 'skins');
  return <InventoryRow item={skinNft} collectionFloor={quote?.floor ?? undefined} collectionStale={quote?.available === false}/>;
}

function InventoryRow({ item, id, collectionFloor, collectionStale, matched }: { item: CatalogItem; id?: string; collectionFloor?: number; collectionStale?: boolean; matched?: boolean }) {
  const titleId = useId();
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const { data: market, stale } = itemMarket.useSnapshot();
  const marketKey = item.file.split('.')[0];
  const listing = market?.items.find(quote => quote.id === marketKey);
  const gameId = (mintableItems as Record<string, number>)[marketKey];
  const mintPrice = market?.mintQuotes?.[marketKey] ?? itemMintGram[gameId];
  const key = ({
    'rogach.webp': 'beetle', 'big-black-clock.webp': 'clock', 'flask-empty.webp': 'flask-sp',
    'floppy-empty.webp': 'floppy-xp',
  }[item.file] ?? item.file.split('.')[0]);
  const offer = shopItems.find(offer => offer.id === (item.offerId ?? key));
  const level = item.minLevel ?? offer?.required_level;
  const price = item.price ?? (offer && { value: offer.price, currency: offer.currency as Currency });
  const floor = collectionFloor ?? listing?.floor;
  const latest = market?.updatedAt ? Date.now() - Date.parse(market.updatedAt) < 20 * 60_000 : true;
  const staleFloor = !!floor && (collectionFloor !== undefined ? collectionStale : (stale || market?.status === 'stale' || !latest));
  const itemCollectionAddress = gameId
    ? ([45, 46, 47, 48, 49, 74, 75].includes(gameId)
        ? expCollection.address
        : [43, 44].includes(gameId)
          ? vouchersCollection.address
          : itemsCollection.address)
    : undefined;
  const marketUrl = item.marketAddress
    ? 'https://getgems.io/collection/' + item.marketAddress
    : itemCollectionAddress
      ? itemCollectionMarketUrl(itemCollectionAddress, marketKey)
      : listing?.href;
  const floorLabel = staleFloor ? (en ? 'Last floor' : 'Последний флор') : floor ? 'Getgems'
    : gameId && market?.status === 'ready' && latest && market.source === 'getgems' ? (en ? 'No lots' : 'Нет лотов') : 'Getgems';
  const displayName = en ? (item.nameEn ?? item.name) : item.name;
  const displayEffect = en ? (item.effectEn ?? item.effect) : item.effect;
  const baseSource = en ? (item.sourceEn ?? item.source) : item.source;
  const source = baseSource + (level ? (en ? ` · from Lv. ${level}` : ` · с ${level}-го ур.`) : '');
  return <li className="inventoryRow" id={id} aria-labelledby={titleId} data-matched={matched || undefined}>
    <span className="inventoryIcon"><GameArt path={item.art ?? itemPath(item.file)} size={33}/></span>
    <div className="inventoryCopy">
      <div className="inventoryTitle">
        <h3 id={titleId}>{displayName}</h3>
        <ItemHelp name={displayName} file={item.file} art={item.art} effect={displayEffect} source={source}/>
      </div>
      {price && <span className="inventoryShopPrice"><Price value={price.value} currency={price.currency}/></span>}
      <p>{displayEffect}</p>
      <small className="itemSource">{source}</small>
      <div className="inventoryPriceStrip">
        {price?.currency === 'stars' && <span className="inventoryEstimate"><GramEstimate stars={price.value}/></span>}
        {mintPrice !== undefined && <span className="inventoryMint">{en ? 'Mint ' : 'Минт '}<Price value={mintPrice} currency="gram"/></span>}
        {marketUrl ? <a className="inventoryFloor" href={marketUrl} target="_blank" rel="noreferrer">
            <span>{floorLabel}</span>
            {floor ? <Price value={floor} currency="gram" from/> : null}
            <span aria-hidden="true" className="rowChevron"/>
          </a>
          : floor ? <span className="inventoryFloor"><span>{floorLabel}</span><Price value={floor} currency="gram" from/></span> : null}
      </div>
    </div>
  </li>;
}

export function InventoryPage() {
  const { pathname } = useLocation();
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const [, , slug, file, extra] = pathname.split('/');
  const hasTrailing = Boolean(extra) || (slug !== 'item' && Boolean(file));
  const category = !hasTrailing && slug && Object.hasOwn(categories, slug) ? categories[slug] : undefined;
  const itemCategory = slug === 'item' && file && !extra ? Object.entries(categories).find(([, entry]) =>
    entry.items.some(value => value.file.split('.')[0] === file)) : undefined;
  const item = itemCategory?.[1].items.find(value => value.file.split('.')[0] === file);
  if (slug === 'item') return <section className="card inventoryPanel" data-category={itemCategory?.[0]}>
    {item ? <><h2 className="inventoryCategoryLabel">{en ? itemCategory?.[1].titleEn : itemCategory?.[1].title}</h2>
      <ul className="compactList singleItem">{item === skinNft ? <SkinCollectionRow/> : <InventoryRow item={item}/>}</ul></>
      : <><h2>{en ? 'Item not found' : 'Предмет не найден'}</h2><Link className="textLink" to="/assets" replace>{en ? 'All items' : 'Все предметы'}</Link></>}
  </section>;
  if (slug && !category) {
    return <section className="card inventoryPanel">
      <h2>{en ? 'Category not found' : 'Категория не найдена'}</h2>
      <Link className="textLink" to="/assets" replace>{en ? 'All items' : 'Все предметы'}</Link>
    </section>;
  }

  const categoryOrder = ['decor', 'skins', 'gear', 'consumables', 'craft', 'care', 'squad'] as const;
  const orderedCategories = categoryOrder.map(id => [id, categories[id]] as const);

  return <>
    {(category ? [[slug, category] as const] : orderedCategories).map(([id, entry]) =>
        <details className="card mediaDetails inventoryPanel inventorySection" key={id} id={'inventory-' + id}
          data-category={id} open={category !== undefined || undefined}>
          <summary><GameArt path={itemPath(entry.icon)} size={34}/><span><strong>{en ? entry.titleEn : entry.title}</strong><small>{en ? entry.summaryEn : entry.summary}</small></span></summary>
          <ul className="compactList">{entry.items.map(item => item === skinNft
            ? <SkinCollectionRow key={item.file}/> : <InventoryRow item={item} key={item.file}/>)}</ul>
          {id === 'gear' && !category && <DetailLink className="textLink" to="/assets/gear">{en ? 'Enchant odds & NFTs' : 'Шансы заточки и NFT'}</DetailLink>}
          {id === 'skins' && <DetailLink className="textLink" to="/owl/skins">{en ? 'Skins & bonus calculator' : 'Облики и калькулятор бонуса'}</DetailLink>}
        </details>)}
    {slug === 'gear' && <>
      <EnchantGuide en={en}/>
      <OwlPrices only="items"/>
      <details className="card plainDisclosure"><summary>{en ? 'How an Item Becomes an NFT' : 'Как предмет становится NFT'}</summary>
        <p>{en ? 'Minting transfers an item from your inventory to your TON wallet. You can sell the NFT or return it to the game.' : 'Минт переносит предмет из инвентаря в кошелёк. NFT можно продать или вернуть в игру.'}</p>
        <p>{en ? 'After purchasing with Telegram Stars, minting may be locked for 21 days.' : 'После покупки за Stars минт может быть закрыт на 21 день.'}</p>
      </details>
    </>}
  </>;
}

function EnchantGuide({ en }: { en?: boolean }) {
  return <section className="card enchantGuideCard">
    <div className="mediaHeading">
      <GameArt path={itemPath('scroll-enchant-skin.webp')} size={44}/>
      <div>
        <h2>{en ? 'Enchant Odds & Burn Risk' : 'Шансы и риск заточки'}</h2>
        <p>{en ? 'For skins & rings · enchanters from Squad Shop' : 'Для скинов и колец · заточки из Лавки сквада'}</p>
      </div>
    </div>

    <div className="enchantBurnAlert">
      <span className="enchantBurnIcon" aria-hidden="true">🔥</span>
      <div>
        <strong>{en ? 'On failure, the item crumbles into Eggshell Shards' : 'При неудаче предмет рассыпается в осколки скорлупы'}</strong>
        <p>{en ? 'Enchanting up to +3 is 100% guaranteed. At +4 success is 95%, decreasing by 5 percentage points per level.' : 'Заточка до +3 гарантирована. На +4 шанс успеха 95%, затем снижается на пять процентных пунктов за ступень.'}</p>
      </div>
    </div>

    <details className="mediaDetails" id="enchant-chances">
      <summary><strong>{en ? 'Odds from +1 to +20' : 'Шансы от +1 до +20'}</strong></summary>
      <table className="priceTable enchantTable">
        <thead>
          <tr>
            <th scope="col">{en ? 'Target' : 'Цель'}</th>
            <th scope="col">{en ? 'Success' : 'Успех'}</th>
            <th scope="col" className="burnHeader">{en ? 'Burn' : 'Сгорание'}</th>
            <th scope="col">{en ? 'Farm' : 'Фарм'}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 20 }, (_, i) => {
            const target = i + 1;
            const success = 100 - Math.max(0, i - 2) * 5;
            const burn = 100 - success;
            return (
              <tr key={i} className={burn > 0 ? 'rowDanger' : 'rowSafe'}>
                <th scope="row">+{target}</th>
                <td className="successVal">{success}%</td>
                <td className={burn > 0 ? 'burnVal dangerText' : 'burnVal safeText'}>
                  {burn > 0 ? `${burn}% 🔥` : '0%'}
                </td>
                <td className="farmVal">+{target * 5}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  </section>;
}
