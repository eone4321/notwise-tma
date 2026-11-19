import { DetailLink } from '../ui/DetailLink';
import { itemMarket } from './marketData';
import publishing from '../domain/game-publishing.json';
import mintableItems from './mintable-items.json';
import { Link, useLocation } from 'react-router';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { chanceLabel, chancePerOpening } from '../domain/mechanics';
import { dropsFor, eggDrawCounts, itemNames } from './inventory';
import marketCollections from './market-collections.json';
import { OwlPrices } from './OwlPrices';
import { Price, type Currency } from './Price';
import { SkinExamples } from './SkinExamples';
import shopItems from './shop-data.json';
import skinParts from './skin-parts.json';
import { SkinFarmCalculator } from './SkinFarmCalculator';

const eggs = [
  { id: 17, slug: 'mystery', file: 'egg.webp', name: 'Загадочное', badge: 'Капсулы · Лавка за монеты', source: 'Из капсул или за 9 999 монет', details: 'В наградах есть еда, лекарства, оформление, обычный жетон скина и чиллер. У реферального яйца те же шансы.' },
  { id: 56, slug: 'season', file: 'egg-stars.webp', name: 'Загадочное', badge: 'Белое на красном фоне · Stars · Крафт', source: 'За 100 Stars или за 3 000 осколков скорлупы', details: 'В этом варианте могут выпасть свитки заточки кольца и скина. По базовым правилам сезона его выдают за 11–100-е места.' },
  { id: 19, slug: 'red', file: 'golden-egg.webp', name: 'Золотое загадочное', badge: 'Золотое на зелёном фоне · Stars · Крафт', source: 'За 500 Stars или за 15 000 осколков скорлупы', details: 'В пуле есть обычный и эпический жетоны скина. По базовым правилам сезона его выдают за 1–10-е места.' },
  { id: 61, slug: 'referral', file: 'referral-egg.webp', name: 'Реферальное', badge: 'Приглашение друга', source: 'За вход в игру по ссылке друга (+5 000 монет)', details: 'У этого яйца такие же награды и шансы, как у загадочного яйца за монеты.' },
  { id: 18, slug: 'green', file: '18.png', name: 'Специальное загадочное', badge: 'Редкое · бежевое', source: 'Способ получения не подтверждён', details: 'В пуле есть оформление, свитки заточки и эпический жетон скина.' },
  { id: 20, slug: 'gold', file: '20.png', name: 'Специальное золотое загадочное', badge: 'Редкое · белое на жёлтом фоне', source: 'Способ получения не подтверждён', details: 'В пуле есть оформление, свитки заточки и золотой жетон скина.' },
] as const;

const eggOffers: Partial<Record<typeof eggs[number]['slug'], string>> = {
  mystery: 'egg',
  season: 'egg-stars',
  red: 'golden-egg',
};
const marketEggs = marketCollections.find(item => item.id === 'eggs')!;
const itemMintGram: Readonly<Partial<Record<number, number>>> = publishing.itemMintGram;

export function OwlPage() {
  const { pathname } = useLocation();
  const egg = eggs.find(item => pathname === '/owl/' + item.slug);
  const drops = egg ? dropsFor(egg.id) : [];
  const unknownChance = drops.reduce((sum, [id, chance]) => sum + (itemNames[id] ? 0 : chance), 0);
  const isEggIndex = ['/owl', '/owl/shop', '/owl/loot'].includes(pathname);
  return <>
    <nav className="choiceBar profileTabs owlTabs" aria-label="Яйца и скины">
      <Link to="/owl" replace aria-current={isEggIndex || egg ? 'page' : undefined}><GameArt path="/game/items/egg.webp" size={16}/>Яйца</Link>
      <Link to="/owl/skins" replace aria-current={pathname === '/owl/skins' ? 'page' : undefined}><GameGlyph name="skin"/>Скины и жетоны</Link>
    </nav>
    {isEggIndex && <>
      <section className="card leanList eggSources">
        <h2>Лавка, капсулы и награды сезона</h2>
        {eggs.slice(0, 3).map(item => <EggLink key={item.id} egg={item}/>)}
      </section>
      <section className="card leanList eggSources" id="shards">
        <h2>Крафт за скорлупу</h2>
        <DetailLink className="mediaRow" to="/owl/season" aria-label="Загадочное яйцо, 3 000 осколков скорлупы">
          <GameArt path={itemPath('egg-stars.webp')} size={40}/>
          <span className="eggRowText"><strong>Загадочное яйцо</strong><small>3 000 осколков скорлупы</small></span>
          <span className="rowEnd shardCost"><strong>3 000</strong><GameArt path={itemPath('eggshell-shards-icon.webp')} size={23}/><span className="rowChevron" aria-hidden="true"/></span>
        </DetailLink>
        <DetailLink className="mediaRow" to="/owl/red" aria-label="Золотое загадочное яйцо, 15 000 осколков скорлупы">
          <GameArt path={itemPath('golden-egg.webp')} size={40}/>
          <span className="eggRowText"><strong>Золотое загадочное яйцо</strong><small>15 000 осколков скорлупы</small></span>
          <span className="rowEnd shardCost"><strong>15 000</strong><GameArt path={itemPath('eggshell-shards-icon.webp')} size={23}/><span className="rowChevron" aria-hidden="true"/></span>
        </DetailLink>
      </section>
      <section className="card leanList eggSources">
        <h2>За приглашение</h2>
        <EggLink egg={eggs.find(item => item.slug === 'referral')!}/>
      </section>
      <section className="card eggSources">
        <h2>Редкие яйца и NFT</h2>
        <details className="mediaDetails guideDisclosure">
          <summary><GameArt path={itemPath('18.png')} size={34}/>
            <span><strong>Бежевое и белое яйца</strong><small>Награды двух редких видов</small></span></summary>
          <p>Список наград известен для обоих яиц. Где их получить сейчас, пока не подтверждено.</p>
          {eggs.slice(4).map(item => <EggLink key={item.id} egg={item}/>)}
        </details>
        <details className="mediaDetails guideDisclosure">
          <summary><GameArt path="/brand/collections/eggs.png" size={34}/>
            <span><strong>NFT-яйца и лотки Lottoque</strong><small>Коллекции на Getgems</small></span></summary>
          <p>Ранее NFT из коллекции NOT Wise Eggs сжигали за яйца в игре. В 2024 году за NFT-лоток Lottoque обещали 10 специальных золотых яиц. Доступность обмена сейчас не подтверждена.</p>
          <DetailLink className="textLink" to="/collections/market#eggs">Флор NFT-яиц</DetailLink>
          <a className="textLink spacedLink" href={`https://getgems.io/collection/${marketEggs.address}`} target="_blank" rel="noreferrer">NFT-яйца</a>
          <a className="textLink spacedLink" href="https://getgems.io/lottoque" target="_blank" rel="noreferrer">Lottoque</a>
        </details>
      </section>
    </>}
    {pathname === '/owl/skins' && <SkinCatalog/>}
    {egg && <section className="card">
      <div className="mediaHeading"><GameArt path={itemPath(egg.file)} size={64}/>
        <div><h2>{egg.name} яйцо</h2><p>{egg.source}</p></div>
      </div>
      <p>{egg.details}</p>
      {egg.slug === 'referral' && (
        <p><DetailLink className="textLink" to="/referrals">Как пригласить друзей и получить награды</DetailLink></p>
      )}
      <EggShopPrices slug={egg.slug}/>
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

function EggLink({ egg }: { egg: typeof eggs[number] }) {
  return <DetailLink to={'/owl/' + egg.slug} className="mediaRow">
    <GameArt path={itemPath(egg.file)} size={38}/>
    <span className="eggRowText"><strong>{egg.name} яйцо</strong><small className="eggBadgeSubtitle">{egg.badge}</small></span>
    <span className="rowChevron" aria-hidden="true"/>
  </DetailLink>;
}

function EggShopPrices({ slug }: { slug: typeof eggs[number]['slug'] }) {
  const offer = shopItems.find(item => item.id === eggOffers[slug]);
  if (!offer) return null;
  return <span className="eggPrices" aria-label="Цена в Лавке">
    <Price value={offer.price} currency={offer.currency === 'stars' ? 'stars' : 'coins'}/>
  </span>;
}

const itemPath = (file: string) => '/game/items/' + file;

type CatalogItem = {
  name: string; file: string; effect: string; source: string;
  offerId?: string;
  price?: { value: number; currency: Currency };
};
type Category = { title: string; icon: string; summary: string; items: CatalogItem[] };

const floppySpecs = [
  ['100k', '100 000', '200 000'], ['1m', '1 млн', '2 млн'],
  ['10m', '10 млн', '20 млн'], ['100m', '100 млн', '200 млн'], ['1b', '1 млрд', '2 млрд'],
] as const;

const rings = shopItems.filter(offer => offer.category === 'ring').map(offer => {
  const attribute = offer.stat === 'strength' ? 'силе' : offer.stat === 'agility' ? 'ловкости' : 'мудрости';
  const effect = offer.stat === 'strength' ? 'Усиливает обычные удары.' :
    offer.stat === 'agility' ? 'Повышает шанс уклониться.' : 'Повышает шанс крита и запас маны.';
  const tier = offer.tier ?? 1;
  const level = offer.required_level ?? (tier === 1 ? 5 : tier === 2 ? 10 : 20);
  const levelText = `с ${level}-го уровня`;
  return {
    name: offer.name_ru,
    file: offer.id + '.webp',
    effect: `+${[2, 5, 10][tier - 1]} к ${attribute}. ${effect}`,
    source: `Лавка · ${levelText}`,
  };
});

const categories: Record<string, Category> = {
  consumables: {
    title: 'Расходники', icon: 'seba-cola.webp', summary: 'Лавка Wise Plaza · защита, пластилин, колбы и книги',
    items: [
      { name: 'Seba Cola', file: 'seba-cola.webp', effect: 'Защищает сову от рейдов и подбора в соперники на 24 часа. Если сова сама нападёт, защита спадёт.', source: 'Лавка', price: { value: 1500, currency: 'coins' } },
      { name: 'Зажигалка', file: 'lighter.webp', effect: '10 зарядов для благословений в ритуалах сквада. Доступна с 3-го уровня.', source: 'Лавка или яйца' },
      { name: 'Большие чёрные часы', file: 'big-black-clock.webp', effect: 'Блокируют новый штраф за голод на 30 дней. Действующий штраф закончится по своему таймеру. Каждые часы добавляют ещё 30 дней защиты.', source: 'Лавка', price: { value: 10000, currency: 'coins' } },
      { name: 'Эпическая книга исследователей', file: 'book.webp', effect: 'Открывает ежедневную загадку на 60 секунд. Верный ответ даёт монеты, опыт и +5 мудрости на сутки. Три ошибки уничтожают книгу.', source: 'Лавка', price: { value: 20000, currency: 'coins' } },
      { name: 'Холодильник XP', file: 'chiller.webp', effect: 'Открытая дверца замораживает опыт: капсулы продолжают давать монеты и лут, но XP не начисляется.', source: 'Лавка', price: { value: 100000, currency: 'coins' } },
      { name: 'Морфер', file: 'morpher.webp', effect: 'Сбрасывает распределение характеристик и навыки совы. Очки навыков (SP) сохраняются.', source: 'Лавка', offerId: 'morpher-stars' },
      { name: 'Пустая колба SP', file: 'flask-empty.webp', effect: 'Заготовка для записи SP. Для заполнения нужно вдвое больше SP, чем вмещает колба. Сгорают все свободные SP совы.', source: 'Лавка', price: { value: 500, currency: 'stars' } },
      { name: 'Пустая дискета XP', file: 'floppy-empty.webp', effect: 'Заготовка для записи XP. Запись сбрасывает весь текущий опыт, SP и навыки, сова снова становится яйцом.', source: 'Лавка', price: { value: 500, currency: 'stars' } },
      { name: 'Таблетка восстановления', file: 'recovery-pill.webp', effect: 'Снимает штраф голода и полностью восстанавливает сытость (20). Можно использовать раз в 7 дней.', source: 'Лавка', price: { value: 300, currency: 'stars' } },
    ],
  },
  squad: {
    title: 'Лавка сквада', icon: 'morpher.webp', summary: 'Морфер, заточки и зажигалка за серебро осад',
    items: [
      { name: 'Морфер', file: 'morpher.webp', effect: 'Сбрасывает распределение характеристик и навыки совы. Очки навыков (SP) сохраняются.', source: 'Лавка сквада', price: { value: 5000, currency: 'squad_silver' } },
      { name: 'Заточка кольца', file: 'scroll-enchant-ring.webp', effect: 'Мистический свиток с поля осады. Улучшает кольцо: +1 к его атрибуту и +5% к бонусу фарма монет.', source: 'Лавка сквада', price: { value: 500, currency: 'squad_silver' } },
      { name: 'Заточка скина', file: 'scroll-enchant-skin.webp', effect: 'Мистический свиток с поля осады. Улучшает скин, прибавляя 5% к бонусу фарма монет за ступень.', source: 'Лавка сквада', price: { value: 5000, currency: 'squad_silver' } },
      { name: 'Зажигалка сквада', file: 'lighter.webp', effect: 'Один заряд позволяет благословить сквад в ежедневном ритуале за командное серебро.', source: 'Лавка сквада', offerId: 'squad-lighter' },
      { name: 'Холодильник XP (Сквад)', file: 'chiller.webp', effect: 'Замораживает опыт совы при открытии капсул. Покупка за валюту осад.', source: 'Лавка сквада', price: { value: 25000, currency: 'squad_silver' } },
      { name: 'Универсальная заточка', file: 'enchanter.webp', effect: 'Подходит для кольца и скина. За одну ступень даёт тот же бонус, что и соответствующий свиток.', source: 'Награда осад' },
    ],
  },
  gear: {
    title: 'Кольца и артефакты', icon: 'ring-wit-3.webp', summary: 'Кольца атрибутов и Монтмориллонит',
    items: [
      ...rings,
      { name: 'Монтмориллонит', file: 'montmorillonite.webp', effect: 'С экипированным артефактом здоровье остаётся полным, а бонус фарма монет растёт на 10%. Выпадает из загадочных яиц.',
        source: 'Лавка или яйца', price: { value: 999999, currency: 'coins' } },
    ],
  },
  care: {
    title: 'Еда и лекарства', icon: 'croissant.webp', summary: 'Сытость, здоровье и любимая еда',
    items: [
      ...([[1, 5], [2, 5], [3, 5], [5, 10], [6, 10], [7, 20], [8, 20]] as const).map(([id, satiety]) => ({
        name: itemNames[id][0], file: itemNames[id][1],
        effect: `Восстанавливает ${satiety} сытости.${id === 7 ? ' Доступна с 5-го уровня.' : ''}`,
        source: id >= 5 ? 'Лавка или яйца' : 'Лавка',
      })),
      { name: 'Подорожник', file: 'plantain.webp', effect: 'Восстанавливает 1 здоровье.', source: 'Лавка' },
      { name: 'Пластырь', file: 'patch.webp', effect: 'Восстанавливает 20 здоровья.', source: 'Лавка или яйца' },
      { name: 'Аптечка', file: 'first-aid-kit.webp', effect: 'Восстанавливает 50 здоровья. Доступна с 5-го уровня.', source: 'Лавка или яйца' },
    ],
  },
  craft: {
    title: 'Крафт и хранение XP', icon: 'eggshell-shards-icon.webp', summary: 'Скорлупа, дискеты опыта, колбы SP и ваучеры',
    items: [
      { name: 'Осколки скорлупы', file: 'eggshell-shards-icon.webp', effect: 'Из осколков можно собрать яйца и другие награды. Загадочное яйцо стоит 3 000 осколков, золотое загадочное — 15 000.', source: 'Яйца и капсулы' },
      ...floppySpecs.map(([id, contents, cost]) => ({
        name: 'Дискета ' + contents + ' XP', file: 'floppy-' + id + '.webp',
        effect: `Нужна пустая дискета и минимум ${cost} XP. Запись сбрасывает весь текущий опыт, SP и навыки, сова снова становится яйцом. При чтении дискета даёт ${contents} XP.`, source: 'Из пустой дискеты',
      })),
      { name: 'Колба на 100 000 SP', file: 'flask-half.webp', effect: 'Даёт 100 000 очков навыков при использовании. Для записи нужна пустая колба и минимум 200 000 SP.', source: 'Из пустой колбы' },
      { name: 'Колба на 1 000 000 SP', file: 'flask-full.webp', effect: 'Даёт 1 000 000 очков навыков при использовании. Для записи нужна пустая колба и минимум 2 000 000 SP.', source: 'Из пустой колбы' },
      ...([['10k', 10_000], ['100k', 100_000]] as const).map(([id, value]): CatalogItem => ({
        name: `Ваучер ${value.toLocaleString('ru-RU')} $NOT`, file: `voucher-${id}.webp`,
        effect: 'Накопи $NOT в игре, нажми на баланс Notcoin и выбери ваучер. Игра спишет $NOT с игрового баланса.',
        source: 'Раздел «Ноткоины»', price: { value, currency: 'not' },
      })),
    ],
  },
  decor: {
    title: 'Оформление', icon: 'birch.webp', summary: 'Гирлянды, деревья и фон совы',
    items: [
      { name: 'Цветная гирлянда', file: 'string-light-color.webp', effect: 'Включает разноцветные огни на дереве совы.', source: 'Яйца' },
      { name: 'Белая гирлянда', file: 'string-lights.webp', effect: 'Включает белые огни на дереве совы.', source: 'Яйца' },
      { name: 'Берёзовая кора', file: 'birch.webp', effect: 'Заменяет внешний вид дерева на домашнем экране.', source: 'Яйца' },
      { name: 'Дубайский шоколад', file: 'dubai-chocolate.webp', effect: 'Переносит гнездо совы на небоскрёб в Дубае.', source: 'Яйца' },
      { name: 'Ветка Эмпайр-стейт', file: 'new-york.webp', effect: 'Переносит гнездо совы на небоскрёб в Нью-Йорке.', source: 'Фон для совы' },
    ],
  },
};

const jettons: (CatalogItem & { id: number })[] = [
  { id: 25, name: 'Обычный жетон', file: 'skin-jetton.webp', effect: 'Даёт случайный обычный скин с новым оперением.', source: 'Яйца' },
  { id: 26, name: 'Эпический жетон', file: 'skin-jetton-epic.webp', effect: 'Даёт случайный эпический скин с оперением и несколькими аксессуарами.', source: 'Яйца' },
  { id: 27, name: 'Золотой жетон', file: 'skin-jetton-golden.webp', effect: 'Даёт случайный эпический скин с золотым оперением. Цепь NOT зависит от выпавших деталей.', source: 'Яйца' },
];

function lootDestination(id: number, file: string) {
  if ([25, 26, 27].includes(id)) return '/owl/skins#jetton-' + id;
  return Object.values(categories).some(category => category.items.some(item => item.file === file))
    ? '/assets/item/' + file.split('.')[0] : undefined;
}

function SkinCatalog() {
  const { data: market } = itemMarket.useSnapshot();
  const mint = market?.mintQuotes?.['owl-skin'] ?? itemMintGram[mintableItems['owl-skin']];
  return <>
    <SkinExamples/>
    <section className="card" id="skin-calculator">
      <SkinFarmCalculator showTitle />
      {mint !== undefined && <p className="skinMintFee">Минт скина <Price value={mint} currency="gram"/></p>}
    </section>
    <section className="card">
    <h2>Жетоны скинов</h2>
    <p className="caption">Переверни жетон в инвентаре, чтобы получить скин. После этого его можно надеть на сову.</p>
    <ul className="compactList">{jettons.map(item =>
      <InventoryRow item={item} key={item.file} id={'jetton-' + item.id}/>)}</ul>
    </section>
    <details className="card plainDisclosure"><summary>Все детали скинов</summary>
      {([
        ['body', 'Оперение'], ['hat', 'Головные уборы'], ['glasses', 'Очки'],
        ['chest', 'Украшения на груди'], ['eyes', 'Глаза'],
      ] as const).map(([slot, label]) => <p key={slot}><strong>{label} · </strong>{skinParts[slot].join(', ')}</p>)}
    </details>
  </>;
}

function InventoryRow({ item, id }: { item: CatalogItem; id?: string }) {
  const { data: market } = itemMarket.useSnapshot();
  const marketKey = item.file.split('.')[0];
  const listing = market?.items.find(quote => quote.id === marketKey);
  const gameId = (mintableItems as Record<string, number>)[marketKey];
  const mintPrice = market?.mintQuotes?.[marketKey] ?? itemMintGram[gameId];
  const key = ({
    'rogach.webp': 'beetle', 'big-black-clock.webp': 'clock', 'flask-empty.webp': 'flask-sp',
    'floppy-empty.webp': 'floppy-xp',
  }[item.file] ?? item.file.split('.')[0]);
  const offer = shopItems.find(offer => offer.id === (item.offerId ?? key));
  const level = offer?.required_level;
  const price = item.price ?? (offer && { value: offer.price, currency: offer.currency as Currency });
  const showLevel = level && !item.source.includes('уровн');
  return <li className="inventoryRow" id={id}>
    <GameArt path={itemPath(item.file)} size={36}/>
    <div><h3>{item.name}</h3><p>{item.effect}</p>
      <div className="inventoryMeta">
        <small className="itemSource">{item.source}{showLevel ? ` · с ${level}-го ур.` : ''}</small>
        {mintPrice !== undefined && <span className="inventoryMint">Минт NFT <Price value={mintPrice} currency="gram"/></span>}
      </div>
    </div>
    {(price || listing) && <div className="inventoryPrices">
      {price && <Price value={price.value} currency={price.currency}/>}
      {listing && (listing.href
        ? <a className="inventoryFloor" href={listing.href} target="_blank" rel="noreferrer"
          aria-label={`${item.name} за ${listing.floor.toLocaleString('ru-RU')} GRAM на Getgems`}>
          <Price value={listing.floor} currency="gram"/><span aria-hidden="true" className="externalMark"/>
        </a>
        : <span className="inventoryFloor"><Price value={listing.floor} currency="gram"/></span>)}
    </div>}
  </li>;
}

export function InventoryPage() {
  const { pathname } = useLocation();
  const [, , slug, file] = pathname.split('/');
  const category = Object.hasOwn(categories, slug) ? categories[slug] : undefined;
  const item = slug === 'item' ? Object.values(categories).flatMap(entry => entry.items)
    .find(value => value.file.split('.')[0] === file) : undefined;
  if (slug === 'skins') return <SkinCatalog/>;
  if (slug === 'item') return <section className="card">
    {item ? <ul className="compactList singleItem"><InventoryRow item={item}/></ul> : <p>Предмет не найден.</p>}
  </section>;

  return <>
    {(category ? [[slug, category] as const] : Object.entries(categories)).map(([id, entry]) =>
      <details className="card inventorySection" key={id} open={category !== undefined || undefined}>
        <summary><GameArt path={itemPath(entry.icon)} size={34}/><span><strong>{entry.title}</strong><small>{entry.summary}</small></span></summary>
        <ul className="compactList">{entry.items.map(item => <InventoryRow item={item} key={item.file}/>)}</ul>
        {id === 'gear' && !category && <DetailLink className="textLink" to="/assets/gear">Шансы заточки и NFT</DetailLink>}
      </details>)}
    {slug === 'gear' && <>
      <EnchantGuide/>
      <OwlPrices only="items"/>
      <details className="card plainDisclosure"><summary>Как предмет становится NFT</summary>
        <p>При выпуске NFT предмет уходит из инвентаря и появляется в кошельке. Его можно продать или вернуть в игру. Покупка за Stars может закрыть выпуск на 21 день.</p>
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
        <strong>Внимание: предмет сгорает при неудаче!</strong>
        <p>
          При неудачной заточке предмет не сохраняется и не откатывается на ступень назад, а <strong>полностью уничтожается</strong> —
          в игре появляется сообщение: <em>«The item crumbled into shards · +Eggshell Shards»</em> (предмет рассыпается на осколки скорлупы).
        </p>
        <p>
          Первые 3 ступени <strong>(+1, +2, +3)</strong> гарантированы на <strong>100%</strong> (риск 0%).
          Ступень <strong>+4</strong> имеет шанс успеха <strong>95%</strong> (5% риск безвозвратно сжечь скин или кольцо!).
          Далее шанс успеха падает на 5% за каждый уровень.
        </p>
      </div>
    </div>

    <details className="plainDisclosure" open>
      <summary>Таблица шансов на каждой ступени (+1..+20)</summary>
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
