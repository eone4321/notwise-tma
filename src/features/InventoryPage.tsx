import { DetailLink } from '../ui/DetailLink';
import { useId } from 'react';
import { collectionMarket, itemMarket } from './marketData';
import publishing from '../domain/game-publishing.json';
import mintableItems from './mintable-items.json';
import { Link, useLocation } from 'react-router';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { chanceLabel, chancePerOpening } from '../domain/mechanics';
import { dropsFor, eggDrawCounts, itemNames } from './inventory';
import marketCollections from './market-collections';
import { OwlPrices } from './OwlPrices';
import { Price, type Currency } from './Price';
import { GramEstimate, StarsAndGram } from './GamePrice';
import { ItemHelp } from './ItemHelp';
import { ringCatalog } from './combat-builds';
import shopItems from './shop-data.json';
import skinParts from './skin-parts.json';
import { SkinFarmCalculator } from './SkinFarmCalculator';
import { itemCollectionMarketUrl } from '../domain/item-market-links';

const eggs = [
  { id: 17, slug: 'mystery', file: 'egg.webp', name: 'Загадочное яйцо', note: 'Также выпадает из капсул', source: 'Лавка или капсулы', reward: 'Еда, лекарства, оформление, обычный жетон скина и чиллер.' },
  { id: 56, slug: 'season', file: 'egg-stars.webp', name: 'Загадочное яйцо', note: 'Может дать свитки заточки', source: 'Лавка, крафт или награда сезона', reward: 'Из яйца могут выпасть свитки заточки кольца и скина. По базовым правилам сезона его получают игроки с 11-го по 100-е место.', shards: 3000 },
  { id: 19, slug: 'red', file: 'golden-egg.webp', name: 'Золотое загадочное яйцо', note: 'Может дать эпический жетон', source: 'Лавка, крафт или награда сезона', reward: 'Из яйца могут выпасть обычный и эпический жетоны скина и свитки заточки. По базовым правилам сезона его получают игроки из первой десятки.', shards: 15000 },
  { id: 61, slug: 'referral', file: 'referral-egg.webp', name: 'Реферальное яйцо', note: 'За вход по ссылке друга', source: 'Вход по ссылке друга', reward: 'Приглашённый получает яйцо и 5 000 монет. У яйца тот же набор наград и шансов, что у загадочного за монеты.' },
  { id: 18, slug: 'green', file: '18.png', name: 'Особое загадочное яйцо', note: 'Свитки и эпический жетон', source: 'Способ получения сейчас неизвестен', reward: 'Может дать оформление, свитки заточки и эпический жетон скина.' },
  { id: 20, slug: 'gold', file: '20.png', name: 'Особое золотое яйцо', note: 'Свитки и золотой жетон', source: 'Способ получения сейчас неизвестен', reward: 'Может дать оформление, свитки заточки и золотой жетон скина.' },
] as const;

type Egg = typeof eggs[number];

const marketEggs = marketCollections.find(item => item.id === 'eggs')!;
const itemMintGram: Readonly<Partial<Record<number, number>>> = publishing.itemMintGram;

export function OwlPage() {
  const { pathname, state } = useLocation();
  const keepParent = state?.guideDetail === true;
  const [, , slug] = pathname.split('/');
  const egg = eggs.find(item => pathname === '/owl/' + item.slug);
  const drops = egg ? dropsFor(egg.id) : [];
  const shopPrice = egg && eggPrice(egg, 'shop');
  const unknownChance = drops.reduce((sum, [id, chance]) => sum + (itemNames[id] ? 0 : chance), 0);
  const isEggIndex = ['/owl', '/owl/shop', '/owl/loot'].includes(pathname);
  return <>
    {!egg && <nav className="choiceBar profileTabs owlTabs" aria-label="Яйца и скины">
      <Link to="/owl" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={isEggIndex ? 'page' : undefined}><GameArt path="/game/items/egg.webp" size={16}/>Яйца</Link>
      <Link to="/owl/skins" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={slug === 'skins' ? 'page' : undefined}><GameGlyph name="skin"/>Скины и жетоны</Link>
    </nav>}
    {isEggIndex && <>
      <section className="card leanList eggSources">
        <h2>Лавка</h2>
        {eggs.slice(0, 3).map(egg => <EggLink key={egg.id} egg={egg} method="shop"/>)}
      </section>
      <section className="card leanList eggSources" id="shards">
        <h2>Крафт за скорлупу</h2>
        <p className="caption">Крафт и покупка одного яйца дают одинаковый дроп.</p>
        {eggs.filter(egg => 'shards' in egg).map(egg => <EggLink key={egg.id} egg={egg} method="craft"/>)}
      </section>
      <section className="card leanList eggSources">
        <h2>За приглашение</h2>
        <EggLink egg={eggs[3]}/>
      </section>
      <section className="card eggSources">
        <h2>Другие яйца</h2>
        <details className="mediaDetails guideDisclosure">
          <summary><GameArt path={itemPath('18.png')} size={34}/>
            <span><strong>Особые яйца</strong><small>Эпический и золотой жетоны</small></span></summary>
          <p>Для обоих яиц известны награды. Способ получения в текущем сезоне пока не подтверждён.</p>
          {eggs.slice(4).map(egg => <EggLink key={egg.id} egg={egg}/>)}
        </details>
        <details className="mediaDetails guideDisclosure">
          <summary><GameArt path="/brand/collections/eggs.png" size={34}/>
            <span><strong>NFT-яйца и лотки Lottoque</strong><small>Коллекции на Getgems</small></span></summary>
          <p>Раньше сжигание NOT Wise Eggs давало игровые яйца. В 2024 году за Lottoque обещали 10 особых золотых яиц.</p><p>Доступность обмена сейчас не подтверждена.</p>
          <DetailLink className="textLink" to="/collections/market#eggs">Флор NFT-яиц</DetailLink>
          <a className="textLink spacedLink" href={`https://getgems.io/collection/${marketEggs.address}`} target="_blank" rel="noreferrer">NFT-яйца</a>
          <a className="textLink spacedLink" href="https://getgems.io/lottoque" target="_blank" rel="noreferrer">Lottoque</a>
        </details>
      </section>
    </>}
    {pathname === '/owl/skins' && <SkinCatalog/>}
    {egg && <section className="card">
      <div className="mediaHeading"><GameArt path={itemPath(egg.file)} size={64}/>
        <div><h2>{egg.name}</h2><p>{egg.source}</p></div>
      </div>
      {shopPrice && <div className="eggDetailPrices">
        <span>В Лавке {shopPrice.currency === 'stars' ? <StarsAndGram stars={shopPrice.value}/> : <Price value={shopPrice.value} currency={shopPrice.currency}/>}</span>
        {'shards' in egg && <span>За скорлупу <Price value={egg.shards} currency="shards"/></span>}
      </div>}
      <p>{egg.reward}</p>
      {egg.slug === 'referral' && (
        <p><DetailLink className="textLink" to="/referrals">Как пригласить друзей и получить награды</DetailLink></p>
      )}
      <h3>Шанс за открытие</h3>
      <p className="caption">Шанс получить награду хотя бы раз. За открытие выпадает 1 предмет в 80% случаев, 2 — в 15%, 3 — в 5%.</p>
      <ul className="compactList lootList">
        {drops.filter(([id]) => itemNames[id]).sort((a, b) => b[1] - a[1]).map(([id, chance]) => {
          const [name, file] = itemNames[id];
          const target = lootDestination(id, file);
          const row = (
            <>
              <GameArt path={itemPath(file)} size={36}/>
              <span className="lootItemName">{name}</span>
              <span className="rowEnd lootRowEnd">
                <strong className="lootChancePercent">{chanceLabel(chancePerOpening(chance, eggDrawCounts))}</strong>
                {target && <span className="rowChevron" aria-hidden="true"/>}
              </span>
            </>
          );
          return <li key={id}>{target
            ? <DetailLink className="mediaRow" to={target}>{row}</DetailLink>
            : <div className="mediaRow">{row}</div>}</li>;
        })}
        {unknownChance > 0 && <li className="mediaRow">
          <span>Другие редкие награды</span><strong>{chanceLabel(chancePerOpening(unknownChance, eggDrawCounts))}</strong>
        </li>}
      </ul>
      <details><summary>Почему шанс не гарантирует награду?</summary>
        <p>Каждое открытие независимо. «1 из 100» — средняя частота выпадения за много попыток. Награда может выпасть дважды подряд или долго не выпадать.</p>
      </details>

    </section>}
  </>;
}

export function CarePage() {
  return <>
    <section className="card feedingCard">
      <div className="mediaHeading"><GameArt path={itemPath('croissant.webp')} size={48}/>
        <div><h2>Сытость</h2><p>Покорми сову хотя бы раз в три дня.</p></div>
      </div>
      <dl className="compactList">
        <div className="mediaRow"><dt>Максимум</dt><dd>20</dd></div>
        <div className="mediaRow"><dt>Для полёта</dt><dd>от 10</dd></div>
        <div className="mediaRow"><dt>Любимая еда</dt><dd>×2 сытости</dd></div>
      </dl>
      <DetailLink className="textLink" to="/assets/care">Еда и лекарства</DetailLink>
    </section>
    <section className="card feedingCard">
      <div className="mediaHeading"><GameArt path="/game/items/first-aid-kit.webp" size={38}/><h2>Голод</h2></div>
      <p>За три дня без еды сова получает штраф на 24 ч. Монет и опыта становится вдвое меньше, а здоровье и энергия восстанавливаются вдвое медленнее.</p>
    </section>
  </>;
}

function eggPrice(egg: Egg, method: 'shop' | 'craft'): CatalogItem['price'] {
  if (method === 'craft') return 'shards' in egg ? { value: egg.shards, currency: 'shards' } : undefined;
  const offer = shopItems.find(item => item.item_id === egg.id && item.category === 'egg');
  if (offer) return { value: offer.price, currency: offer.currency === 'stars' ? 'stars' : 'coins' };
}

function EggLink({ egg, method }: { egg: Egg; method?: 'shop' | 'craft' }) {
  const price = method && eggPrice(egg, method);
  return <DetailLink to={'/owl/' + egg.slug} className="mediaRow eggLink" data-method={method}>
    <GameArt path={itemPath(egg.file)} size={38}/>
    <span className="eggRowText"><strong>{egg.name}</strong>{method !== 'craft' && <small>{egg.note}</small>}</span>
    <span className="rowEnd">
      {price && (price.currency === 'stars' ? <StarsAndGram stars={price.value}/> : <Price value={price.value} currency={price.currency}/>)}
      <span className="rowChevron" aria-hidden="true"/>
    </span>
  </DetailLink>;
}

const itemPath = (file: string) => '/game/items/' + file;
const skinsCollection = marketCollections.find(item => item.id === 'skins')!;
const itemsCollection = marketCollections.find(item => item.id === 'items')!;

type CatalogItem = {
  name: string; file: string; effect: string; source: string;
  offerId?: string;
  minLevel?: number;
  art?: string;
  marketAddress?: string;
  price?: { value: number; currency: Currency };
};
type Category = { title: string; icon: string; summary: string; items: CatalogItem[] };

const jettons: (CatalogItem & { id: number })[] = [
  { id: 25, name: 'Обычный жетон', file: 'skin-jetton.webp', effect: 'Даёт случайный скин с обычным оперением.', source: 'Яйца', marketAddress: itemsCollection.address },
  { id: 26, name: 'Эпический жетон', file: 'skin-jetton-epic.webp', effect: 'Даёт скин с оперением и несколькими аксессуарами.', source: 'Яйца', marketAddress: itemsCollection.address },
  { id: 27, name: 'Золотой жетон', file: 'skin-jetton-golden.webp', effect: 'Гарантирует золотое оперение. Цепь NOT может выпасть среди аксессуаров.', source: 'Яйца', marketAddress: itemsCollection.address },
];
const skinNft: CatalogItem = {
  name: 'Готовые NFT-скины', file: 'owl-skin.webp', art: '/brand/collections/skins.png',
  effect: 'Выбери готовый облик с нужным оперением и аксессуарами.',
  source: 'Коллекция NOT Wise Skins', marketAddress: skinsCollection.address,
};

const floppySpecs = [
  ['100k', '100 000', '200 000'], ['1m', '1 млн', '2 млн'],
  ['10m', '10 млн', '20 млн'], ['100m', '100 млн', '200 млн'], ['1b', '1 млрд', '2 млрд'],
] as const;

const rings = ringCatalog.map(ring => {
  const attribute = ring.attribute === 'strength' ? 'силе' : ring.attribute === 'agility' ? 'ловкости' : 'мудрости';
  const effect = ring.attribute === 'strength' ? 'Усиливает обычные удары.' :
    ring.attribute === 'agility' ? 'Повышает шанс уклониться.' : 'Повышает шанс крита и запас маны.';
  return {
    name: ring.title, file: ring.id + '.webp', effect: `+${ring.bonus} к ${attribute}. ${effect}`,
    source: 'Лавка', minLevel: ring.minLevel,
  };
});

const categories: Record<string, Category> = {
  consumables: {
    title: 'Расходники', icon: 'seba-cola.webp', summary: 'Защита, сброс навыков и восстановление',
    items: [
      { name: 'Seba Cola', file: 'seba-cola.webp', effect: 'Защита от рейдов и подбора соперником на 24 ч. Снимается при твоём нападении.', source: 'Лавка', price: { value: 1500, currency: 'coins' } },
      { name: 'Зажигалка', file: 'lighter.webp', effect: '10 зарядов для ритуалов сквада.', source: 'Лавка или яйца', minLevel: 3 },
      { name: 'Большие чёрные часы', file: 'big-black-clock.webp', minLevel: 7, effect: 'Добавляют 30 дней защиты от голода. Действующий штраф сохраняется до конца таймера.', source: 'Лавка', price: { value: 10000, currency: 'coins' } },
      { name: itemNames[38][0], file: 'book.webp', effect: 'Загадка дня на 60 с. Успех даёт монеты, XP и +5 мудрости на сутки. Три ошибки уничтожают книгу.', source: 'Лавка', price: { value: 20000, currency: 'coins' } },
      { name: 'Холодильник XP', file: 'chiller.webp', minLevel: 4, effect: 'Пока дверца открыта, капсулы дают монеты и предметы, а опыт заморожен.', source: 'Лавка', price: { value: 100000, currency: 'coins' } },
      { name: 'Морфер', file: 'morpher.webp', effect: 'Сбрасывает характеристики и навыки. Накопленные SP сохраняются.', source: 'Лавка', offerId: 'morpher-stars' },
      { name: 'Пустая колба SP', file: 'flask-empty.webp', effect: 'Нужна для записи SP. Потребуется вдвое больше SP, чем вмещает колба. Все свободные SP списываются.', source: 'Лавка', price: { value: 500, currency: 'stars' } },
      { name: 'Пустая дискета XP', file: 'floppy-empty.webp', effect: 'Нужна для записи XP. Запись сбрасывает XP, SP и навыки и возвращает сову в яйцо.', source: 'Лавка', price: { value: 500, currency: 'stars' } },
      { name: 'Таблетка восстановления', file: 'recovery-pill.webp', effect: 'Снимает штраф голода и возвращает сытость до 20. Раз в 7 дней.', source: 'Лавка', price: { value: 300, currency: 'stars' } },
    ],
  },
  squad: {
    title: 'Лавка сквада', icon: 'morpher.webp', summary: 'Морфер, свитки заточки и ритуалы',
    items: [
      { name: 'Морфер', file: 'morpher.webp', effect: 'Сбрасывает характеристики и навыки. Накопленные SP сохраняются.', source: 'Лавка сквада', price: { value: 5000, currency: 'squad_silver' } },
      { name: 'Заточка кольца', file: 'scroll-enchant-ring.webp', effect: '+1 к атрибуту кольца и +5% к монетам за каждую ступень заточки.', source: 'Лавка сквада', price: { value: 500, currency: 'squad_silver' } },
      { name: 'Заточка скина', file: 'scroll-enchant-skin.webp', effect: '+5% к монетам за ступень заточки скина.', source: 'Лавка сквада', price: { value: 5000, currency: 'squad_silver' } },
      { name: 'Зажигалка сквада', file: 'lighter.webp', effect: 'Даёт заряд для ежедневного благословения сквада.', source: 'Лавка сквада', offerId: 'squad-lighter' },
      { name: 'Холодильник XP', file: 'chiller.webp', minLevel: 4, effect: 'Открой дверцу, чтобы заморозить опыт из капсул.', source: 'Лавка сквада', price: { value: 25000, currency: 'squad_silver' } },
      { name: 'Универсальная заточка', file: 'enchanter.webp', effect: 'Заменяет свиток заточки кольца или скина.', source: 'Награда осад' },
    ],
  },
  gear: {
    title: 'Кольца и артефакты', icon: 'ring-wit-3.webp', summary: 'Сила, ловкость, мудрость и здоровье',
    items: [
      ...rings,
      { name: 'Монтмориллонит', file: 'montmorillonite.webp', effect: 'Удерживает здоровье полным и даёт +10% к монетам, пока экипирован.',
        source: 'Лавка или яйца', offerId: 'mana-crystal', price: { value: 999999, currency: 'coins' } },
    ],
  },
  skins: {
    title: 'Жетоны и скины', icon: 'skin-jetton-epic.webp', summary: 'Три жетона и готовые NFT-скины',
    items: [...jettons, skinNft],
  },
  care: {
    title: 'Еда и лекарства', icon: 'croissant.webp', summary: 'Восстановление сытости и здоровья',
    items: [
      ...([[1, 5], [2, 5], [3, 5], [5, 10], [6, 10], [7, 20], [8, 20]] as const).map(([id, satiety]) => ({
        name: itemNames[id][0], file: itemNames[id][1],
        effect: `+${satiety} к сытости.`,
        source: id >= 5 ? 'Лавка или яйца' : 'Лавка',
        minLevel: id === 7 ? 5 : undefined,
      })),
      { name: 'Подорожник', file: 'plantain.webp', effect: '+1 к здоровью.', source: 'Лавка' },
      { name: 'Пластырь', file: 'patch.webp', effect: '+20 к здоровью.', source: 'Лавка или яйца' },
      { name: 'Аптечка', file: 'first-aid-kit.webp', effect: '+50 к здоровью.', source: 'Лавка или яйца', minLevel: 5 },
    ],
  },
  craft: {
    title: 'Крафт и накопления', icon: 'eggshell-shards-icon.webp', summary: 'Яйца, хранение XP и SP, ваучеры $NOT',
    items: [
      { name: 'Осколки скорлупы', file: 'eggshell-shards-icon.webp', effect: 'На загадочное яйцо нужно 3 000 осколков, на золотое загадочное — 15 000.', source: 'Яйца и капсулы' },
      ...floppySpecs.map(([id, contents, cost]) => ({
        name: 'Дискета ' + contents + ' XP', file: 'floppy-' + id + '.webp',
        effect: `Для записи нужно ${cost} XP. Запись сбрасывает XP, SP и навыки и возвращает сову в яйцо.`, source: 'Из пустой дискеты',
      })),
      { name: 'Колба на 100 000 SP', file: 'flask-half.webp', effect: 'Для записи нужно 200 000 SP. При использовании даёт 100 000 SP.', source: 'Из пустой колбы' },
      { name: 'Колба на 1 000 000 SP', file: 'flask-full.webp', effect: 'Для записи нужно 2 000 000 SP. При использовании даёт 1 000 000 SP.', source: 'Из пустой колбы' },
      ...([['10k', 10_000], ['100k', 100_000]] as const).map(([id, value]): CatalogItem => ({
        name: `Ваучер ${value.toLocaleString('ru-RU')} $NOT`, file: `voucher-${id}.webp`,
        effect: 'Создаётся за $NOT с игрового баланса.',
        source: 'Раздел «Ноткоины»', price: { value, currency: 'not' },
      })),
    ],
  },
  decor: {
    title: 'Оформление', icon: 'birch.webp', summary: 'Гирлянды, деревья и фон совы',
    items: [
      { name: 'Цветная гирлянда', file: 'string-light-color.webp', effect: 'Включает разноцветные огни на дереве совы.', source: 'Яйца' },
      { name: 'Белая гирлянда', file: 'string-lights.webp', effect: 'Включает белые огни на дереве совы.', source: 'Яйца' },
      { name: 'Берёзовая кора', file: 'birch.webp', effect: 'Меняет кору дерева на берёзовую.', source: 'Яйца' },
      { name: 'Дубайский шоколад', file: 'dubai-chocolate.webp', effect: 'Переносит гнездо совы на небоскрёб в Дубае.', source: 'Яйца' },
      { name: 'Ветка Эмпайр-стейт', file: 'new-york.webp', effect: 'Переносит гнездо совы на небоскрёб в Нью-Йорке.', source: 'Фон для совы' },
    ],
  },
};

function lootDestination(id: number, file: string) {
  if ([25, 26, 27].includes(id)) return '/owl/skins#jetton-' + id;
  return Object.values(categories).some(category => category.items.some(item => item.file === file))
    ? '/assets/item/' + file.split('.')[0] : undefined;
}

function SkinCatalog() {
  return <>
    <SkinFarmCalculator/>
    <section className="card inventoryPanel skinJettons" id="skin-jettons" data-category="skins">
      <h2>Как получить скин</h2>
      <p className="caption">Открой жетон в инвентаре и надень выпавший скин на сову.</p>
      <ul className="compactList">
        {jettons.map(item => <InventoryRow item={item} key={item.file} id={'jetton-' + item.id}/>)}
        <SkinCollectionRow/>
      </ul>
      <details className="mediaDetails skinRuleDisclosure" id="skin-farm-rules">
        <summary><GameArt path="/game/items/scroll-enchant-skin.webp" size={27}/><strong>Как увеличить бонус</strong></summary>
        <p>Обычная деталь даёт +5%, золотое оперение +15%, цепь NOT +10%. Каждый уровень заточки добавляет ещё +5%.</p>
        <p>Золотое оперение, цепь NOT, глаза, очки и убор вместе дают +40% даже без заточки.</p>
        <DetailLink to="/assets/gear" className="textLink">Шансы заточки</DetailLink>
      </details>
    </section>
    <details className="card mediaDetails skinPartsList" id="skin-parts">
      <summary><GameGlyph name="skin"/><strong>Все детали скинов</strong></summary>
      <dl className="skinPartsReference">{([
        ['body', 'Оперение'], ['hat', 'Головные уборы'], ['glasses', 'Очки'],
        ['chest', 'Украшения на груди'], ['eyes', 'Глаза'],
      ] as const).map(([slot, label]) => <div key={slot}><dt>{label}</dt><dd>{skinParts[slot].join(', ')}</dd></div>)}</dl>
    </details>
  </>;
}

function SkinCollectionRow() {
  const { data } = collectionMarket.useSnapshot();
  const quote = data?.items.find(entry => entry.id === 'skins');
  return <InventoryRow item={skinNft} collectionFloor={quote?.floor ?? undefined} collectionStale={quote?.available === false}/>;
}

function InventoryRow({ item, id, collectionFloor, collectionStale }: { item: CatalogItem; id?: string; collectionFloor?: number; collectionStale?: boolean }) {
  const titleId = useId();
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
  const marketUrl = item.marketAddress
    ? 'https://getgems.io/collection/' + item.marketAddress
    : gameId
      ? itemCollectionMarketUrl(itemsCollection.address, marketKey)
      : listing?.href;
  const floorLabel = staleFloor ? 'Последний флор' : floor ? 'Getgems'
    : gameId && market?.status === 'ready' && latest && market.source === 'getgems' ? 'Нет лотов' : 'Getgems';
  const source = item.source + (level ? ` · с ${level}-го ур.` : '');
  return <li className="inventoryRow" id={id} aria-labelledby={titleId}>
    <span className="inventoryIcon"><GameArt path={item.art ?? itemPath(item.file)} size={33}/></span>
    <div className="inventoryCopy">
      <div className="inventoryTitle">
        <h3 id={titleId}>{item.name}</h3>
        <ItemHelp name={item.name} file={item.file} art={item.art} effect={item.effect} source={source}/>
      </div>
      {price && <span className="inventoryShopPrice"><Price value={price.value} currency={price.currency}/></span>}
      <p>{item.effect}</p>
      <small className="itemSource">{source}</small>
      <div className="inventoryPriceStrip">
        {price?.currency === 'stars' && <span className="inventoryEstimate"><GramEstimate stars={price.value}/></span>}
        {mintPrice !== undefined && <span className="inventoryMint">Минт <Price value={mintPrice} currency="gram"/></span>}
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
  const [, , slug, file] = pathname.split('/');
  const category = Object.hasOwn(categories, slug) ? categories[slug] : undefined;
  const itemCategory = slug === 'item' ? Object.entries(categories).find(([, entry]) =>
    entry.items.some(value => value.file.split('.')[0] === file)) : undefined;
  const item = itemCategory?.[1].items.find(value => value.file.split('.')[0] === file);
  if (slug === 'item') return <section className="card inventoryPanel" data-category={itemCategory?.[0]}>
    {item ? <><h2 className="inventoryCategoryLabel">{itemCategory?.[1].title}</h2>
      <ul className="compactList singleItem">{item === skinNft ? <SkinCollectionRow/> : <InventoryRow item={item}/>}</ul></> : <p>Предмет не найден.</p>}
  </section>;

  return <>
    {(category ? [[slug, category] as const] : Object.entries(categories)).map(([id, entry]) =>
        <details className="card mediaDetails inventoryPanel inventorySection" key={id} id={'inventory-' + id}
          data-category={id} open={category !== undefined || undefined}>
          <summary><GameArt path={itemPath(entry.icon)} size={34}/><span><strong>{entry.title}</strong><small>{entry.summary}</small></span></summary>
          <ul className="compactList">{entry.items.map(item => item === skinNft
            ? <SkinCollectionRow key={item.file}/> : <InventoryRow item={item} key={item.file}/>)}</ul>
          {id === 'gear' && !category && <DetailLink className="textLink" to="/assets/gear">Шансы заточки и NFT</DetailLink>}
          {id === 'skins' && <DetailLink className="textLink" to="/owl/skins">Облики и калькулятор бонуса</DetailLink>}
        </details>)}
    {slug === 'gear' && <>
      <EnchantGuide/>
      <OwlPrices only="items"/>
      <details className="card plainDisclosure"><summary>Как предмет становится NFT</summary>
        <p>Минт переносит предмет из инвентаря в кошелёк. NFT можно продать или вернуть в игру.</p><p>После покупки за Stars минт может быть закрыт на 21 день.</p>
      </details>
    </>}
  </>;
}

function EnchantGuide() {
  return <section className="card enchantGuideCard">
    <div className="mediaHeading">
      <GameArt path={itemPath('scroll-enchant-skin.webp')} size={44}/>
      <div>
        <h2>Шансы и риск заточки</h2>
        <p>Для скинов и колец · свитки из Лавки сквада</p>
      </div>
    </div>

    <div className="enchantBurnAlert">
      <span className="enchantBurnIcon" aria-hidden="true">🔥</span>
      <div>
        <strong>При неудаче предмет рассыпается в скорлупу</strong>
        <p>Заточка до +3 гарантирована. На +4 шанс успеха 95%, затем снижается на пять процентных пунктов за ступень.</p>
      </div>
    </div>

    <details className="mediaDetails" id="enchant-chances">
      <summary><strong>Шансы от +1 до +20</strong></summary>
      <table className="priceTable enchantTable">
        <thead>
          <tr>
            <th scope="col">Цель</th>
            <th scope="col">Успех</th>
            <th scope="col" className="burnHeader">Сгорание</th>
            <th scope="col">Фарм</th>
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
