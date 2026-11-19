import { Link, useLocation } from 'react-router';
import { GameArt } from '../ui/GameArt';
import { chanceLabel } from '../domain/mechanics';
import { dropsFor, itemNames } from './inventory';
import marketCollections from './market-collections.json';
import { OwlPrices } from './OwlPrices';
import { Price } from './Price';
import { SkinExamples } from './SkinExamples';
import shopItems from './shop-data.json';
import skinParts from './skin-parts.json';

const eggs = [
  { id: 17, slug: 'mystery', file: 'egg.webp', name: 'Загадочное', source: 'Капсулы и Лавка', details: 'Лавка продаёт его за монеты или Stars. Из капсулы можно получить такое же яйцо. В пуле есть еда, лекарства, оформление и жетон скина.' },
  { id: 19, slug: 'red', file: 'golden-egg-special.webp', name: 'Золотое сезонное', source: 'Награда за места 1–10', details: 'Вручается автоматически по итогам сезона. Может дать два вида жетонов скина.' },
  { id: 56, slug: 'season', file: 'golden-egg.webp', name: 'Сезонное загадочное', source: 'Места 11–100 · золотое яйцо в Лавке', details: 'В сезонном топе награда приходит автоматически. В Лавке этот пул привязан к золотому яйцу за Stars.' },
  { id: 18, slug: 'green', file: '18.png', name: 'Бежевое', source: 'Яйцо из зелёной карточки', details: 'Из этого яйца выпадают оформление, жетон скина и другие награды. Еды в пуле нет.' },
  { id: 20, slug: 'gold', file: '20.png', name: 'Белое', source: 'Яйцо из золотой карточки', details: 'Пул похож на бежевое яйцо, но жетон даёт другой след.' },
] as const;

const eggOffers = [
  ['egg', 'Загадочное яйцо', 'egg.webp', 'mystery'],
  ['egg-stars', 'Загадочное яйцо', 'egg-stars.webp', 'mystery'],
  ['golden-egg', 'Золотое яйцо', 'golden-egg.webp', 'season'],
] as const;
const marketEggs = marketCollections.find(item => item.id === 'eggs')!;
let extraEggsOpen = false;

// Mirrors the base 80/15/5 draw counts and Z6() in the game's public client.
function openingChance(chance: number) {
  const miss = 1 - chance / 100;
  return 100 * (0.8 * (1 - miss) + 0.15 * (1 - miss ** 2) + 0.05 * (1 - miss ** 3));
}

export function OwlPage() {
  const { pathname } = useLocation();
  const egg = eggs.find(item => pathname === '/owl/' + item.slug);
  const care = pathname === '/owl/care';
  const drops = egg ? dropsFor(egg.id) : [];
  const unknownChance = drops.reduce((sum, [id, chance]) => sum + (itemNames[id] ? 0 : chance), 0);
  const isEggIndex = ['/owl', '/owl/shop', '/owl/loot'].includes(pathname);
  return <>
    {isEggIndex && <>
      <section className="card eggSources">
        <h2>Лавка</h2>
        <ul className="compactList">{eggOffers.map(([id, label, file, slug]) => {
          const offer = shopItems.find(item => item.id === id);
          return offer && <li key={id}><Link className="mediaRow eggShopRow" to={'/owl/' + slug}
            state={{ returnTo: pathname }}>
            <GameArt path={itemPath(file)} size={38}/><strong>{label}</strong>
            <Price value={offer.price} currency={offer.currency === 'stars' ? 'stars' : 'coins'}/>
            <span className="rowChevron" aria-hidden="true"/>
          </Link></li>;
        })}</ul>
        <p className="caption">В Лавке три предложения. Два из них ведут к одному загадочному яйцу. Отдельные яйца выпадают в сезоне и других наградах.</p>
      </section>
      <section className="card leanList eggSources">
        <h2>Капсулы и сезон</h2>
        {eggs.slice(0, 3).map(item => <EggLink key={item.id} egg={item} from={pathname}/>)}
        <details className="mediaDetails guideDisclosure" open={extraEggsOpen} onToggle={event => { extraEggsOpen = event.currentTarget.open; }}>
          <summary><GameArt path={itemPath('18.png')} size={34}/><span><strong>Яйца из других карточек</strong><small>Бежевое и белое · отдельные пулы</small></span></summary>
          {eggs.slice(3).map(item => <EggLink key={item.id} egg={item} from={pathname}/>)}
        </details>
      </section>
      <section className="card leanList eggSources">
        <h2>Приглашения</h2>
        <Link to="/referrals" className="mediaRow"><GameArt path={itemPath('referral-egg.webp')} size={38}/>
          <span><strong>Реферальное яйцо</strong><small>За вход в игру по ссылке друга · ещё 5 000 монет</small></span>
          <span className="rowChevron" aria-hidden="true"/>
        </Link>
      </section>
      <section className="card eggSources">
        <h2>NFT-яйца</h2>
        <p>У коллекции NOT Wise Eggs отдельный выпуск на TON. Ранее NFT-яйца сжигали для получения яйца в игре. Доступность обмена сейчас и игровая функция NFT-лотков не подтверждены.</p>
        <a className="textLink" href={`https://getgems.io/collection/${marketEggs.address}`} target="_blank" rel="noreferrer">Открыть коллекцию</a>
        <Link className="textLink spacedLink" to="/collections/market#eggs">Флор</Link>
      </section>
      <section className="card leanList eggSources">
        <Link to="/owl/skins" className="mediaRow"><GameArt path={itemPath('skin-jetton.webp')} size={38}/>
          <span><strong>Скины и жетоны</strong><small>Примеры обликов и бонус к дропу $NOT</small></span>
          <span className="rowChevron" aria-hidden="true"/>
        </Link>
        <Link to="/owl/care" className="mediaRow"><GameArt path={itemPath('croissant.webp')} size={38}/>
          <span><strong>Кормление совы</strong><small>Сытость, любимая еда и голод</small></span>
          <span className="rowChevron" aria-hidden="true"/>
        </Link>
      </section>
    </>}
    {pathname === '/owl/skins' && <SkinCatalog/>}
    {egg && <section className="card">
      <div className="mediaHeading"><GameArt path={itemPath(egg.file)} size={64}/>
        <div><h2>{egg.name} яйцо</h2><p>{egg.source}</p></div>
      </div>
      <p>{egg.details}</p>
      {[17, 56].includes(egg.id) && <div className="eggPrices" aria-label="Цена в Лавке">
        {eggOffers.filter(([, , , slug]) => slug === egg.slug).map(([id]) => {
          const offer = shopItems.find(item => item.id === id);
          return offer && <Price key={id} value={offer.price} currency={offer.currency === 'stars' ? 'stars' : 'coins'}/>;
        })}
      </div>}
      <h3>Шанс за открытие</h3>
      <p className="caption">Шанс получить награду хотя бы раз. За открытие выпадает 1 предмет в 80% случаев, 2 — в 15%, 3 — в 5%.</p>
      <ul className="compactList lootList">
        {drops.filter(([id]) => itemNames[id]).map(([id, chance]) => {
          const [name, file] = itemNames[id];
          const target = lootDestination(id, file);
          const row = <><GameArt path={itemPath(file)} size={36}/><span>{name}</span>
            <span className="rowEnd"><strong>{chanceLabel(openingChance(chance))}</strong>{target && <span className="rowChevron" aria-hidden="true"/>}</span></>;
          return <li key={id}>{target
            ? <Link className="mediaRow" to={target} state={{ returnTo: pathname }}>{row}</Link>
            : <div className="mediaRow">{row}</div>}</li>;
        })}
        {unknownChance > 0 && <li className="mediaRow">
          <span>Другие редкие награды</span><strong>{chanceLabel(openingChance(unknownChance))}</strong>
        </li>}
      </ul>
      <details><summary>Почему шанс не гарантирует награду?</summary>
        <p>Каждое открытие независимо. «1 из 100» — средняя частота выпадения за много попыток. Награда может выпасть дважды подряд или долго не выпадать.</p>
      </details>

    </section>}
    {care && <section className="card">
      <div className="mediaHeading"><GameArt path={itemPath('croissant.webp')} size={52}/>
        <div><h2>Как избежать голода</h2><p>Покорми сову хотя бы раз в три дня.</p></div>
      </div>
      <ul className="compactList">
        <li className="mediaRow"><span>Максимум сытости</span><strong>20</strong></li>
        <li className="mediaRow"><span>Минимум сытости для полёта</span><strong>10</strong></li>
        <li className="mediaRow"><span>Любимая еда</span><strong>×2 сытости</strong></li>
        <li className="mediaRow"><span>Время штрафа</span><strong>24 ч</strong></li>
        <li className="mediaRow"><span>Монеты, XP, восстановление HP и энергии при голоде</span><strong>−50%</strong></li>
      </ul>
      <Link className="textLink" to="/assets/care">Еда и лекарства</Link>
    </section>}
  </>;
}

function EggLink({ egg, from }: { egg: typeof eggs[number]; from: string }) {
  return <Link to={'/owl/' + egg.slug} className="mediaRow" state={{ returnTo: from }}>
    <GameArt path={itemPath(egg.file)} size={38}/>
    <span><strong>{egg.name} яйцо</strong><small>{egg.source}</small></span>
    <span className="rowChevron" aria-hidden="true"/>
  </Link>;
}

const itemPath = (file: string) => '/game/items/' + file;

type CatalogItem = { name: string; file: string; effect: string; source: string };
type Category = { title: string; icon: string; summary: string; items: CatalogItem[] };

const floppySpecs = [
  ['100k', '100 000', '200 000'], ['1m', '1 млн', '2 млн'],
  ['10m', '10 млн', '20 млн'], ['100m', '100 млн', '200 млн'], ['1b', '1 млрд', '2 млрд'],
] as const;

const rings = shopItems.filter(offer => offer.category === 'ring').map(offer => {
  const attribute = offer.stat === 'strength' ? 'силе' : offer.stat === 'agility' ? 'ловкости' : 'мудрости';
  const effect = offer.stat === 'strength' ? 'Усиливает обычные удары.' :
    offer.stat === 'agility' ? 'Повышает шанс уклониться.' : 'Повышает шанс крита и запас маны.';
  return { name: offer.name_ru, file: offer.id + '.webp', effect: `+${[2, 5, 10][(offer.tier ?? 1) - 1]} к ${attribute}. ${effect}`, source: 'Лавка' };
});

const categories: Record<string, Category> = {
  care: {
    title: 'Еда и лекарства', icon: 'croissant.webp', summary: 'Сытость, здоровье и снятие штрафа',
    items: [
      ...[5, 6, 7, 8].map(id => ({
        name: itemNames[id][0], file: itemNames[id][1], effect: 'Восстанавливает сытость. Любимая еда даёт двойную сытость.',
        source: 'Добыча из яиц. Часть еды есть в Лавке за монеты.',
      })),
      { name: 'Рогач', file: 'rogach.webp', effect: 'Съедобный жук. Повышает сытость совы.', source: 'Еда' },
      { name: 'Seba Cola', file: 'seba-cola.webp', effect: 'Защищает сову от рейдов и подбора в соперники. Если сова сама нападёт, защита спадёт. Длительность указана в игре.', source: 'Защита от атак' },
      { name: 'Большие чёрные часы', file: 'big-black-clock.webp', effect: 'Блокируют новый штраф за голод на 30 дней. Действующий штраф закончится по своему таймеру. Каждые часы добавляют ещё 30 дней защиты.', source: 'Защита от голода' },
      { name: 'Груша', file: 'pear.webp', effect: 'Полностью восстанавливает сытость (20).', source: 'Еда' },
      { name: 'Круассан', file: 'croissant.webp', effect: 'Восстанавливает сытость. Может быть любимой едой совы.', source: 'Обычная Лавка · монеты' },
      { name: 'Пластырь', file: 'patch.webp', effect: 'Восстанавливает здоровье.', source: 'Лечение · яйцо' },
      { name: 'Аптечка', file: 'first-aid-kit.webp', effect: 'Восстанавливает 50 здоровья.', source: 'Лечение · яйцо' },
      { name: 'Таблетка восстановления', file: 'recovery-pill.webp', effect: 'Снимает штраф голода и полностью восстанавливает сытость. Можно использовать раз в 7 дней.', source: 'Расходник' },
    ],
  },
  gear: {
    title: 'Кольца и артефакты', icon: 'ring-wit-3.webp', summary: 'Атрибуты и бонус к $NOT',
    items: [
      ...rings,
      ...([
        ['Эпическая книга исследователей', 'book.webp'], ['Монтмориллонит', 'montmorillonite.webp'],
      ] as const).map(([name, file]) => ({
        name, file, effect: file === 'book.webp'
          ? 'Открывает ежедневную загадку. На ответ 60 секунд. Верный ответ даёт монеты, опыт и +5 мудрости на сутки. Три ошибки уничтожают книгу.'
          : 'Пока артефакт экипирован, здоровье остаётся полным. Бонус к дропу $NOT увеличивается на 10%.', source: 'Артефакт',
      })),
      { name: 'Заточка', file: 'enchanter.webp', effect: 'Есть свитки для скинов и для колец, а также универсальная заточка. Каждая ступень добавляет 5% к бонусу дропа $NOT. У кольца также растёт его основной атрибут на 1.', source: 'Премиальная Лавка и крафт' },
    ],
  },
  craft: {
    title: 'Крафт и хранение XP', icon: 'eggshell-shards-icon.webp', summary: 'Скорлупа, дискеты опыта и колбы SP',
    items: [
      { name: 'Холодильник XP', file: 'chiller.webp', effect: 'Открытая дверца замораживает опыт: капсулы продолжают давать монеты и лут, но XP не начисляется.', source: 'Управление опытом' },
      { name: 'Осколки скорлупы', file: 'eggshell-shards-icon.webp', effect: 'Из осколков можно собрать яйца и другие награды. Цена в осколках зависит от рецепта.', source: 'Яйца и капсулы · рецепты в инвентаре' },
      { name: 'Пустая дискета XP', file: 'floppy-empty.webp', effect: 'Заготовка для записи опыта.', source: 'Лавка' },
      ...floppySpecs.map(([id, contents, cost]) => ({
        name: 'Дискета ' + contents + ' XP', file: 'floppy-' + id + '.webp',
        effect: `Для записи нужно ${cost} XP. Запись сбрасывает весь текущий опыт, SP и навыки, сова снова становится яйцом. При чтении дискета даёт ${contents} XP.`, source: 'Перенос опыта',
      })),
      { name: 'Зажигалка сквада', file: 'lighter.webp', effect: 'Один заряд позволяет благословить сквад в ежедневном ритуале. Когда ритуалы выполнят 50% сквада, участники получают бонус на 24 часа.', source: 'Добыча из яиц' },
      { name: 'Пустая колба SP', file: 'flask-empty.webp', effect: 'Для заполнения нужно вдвое больше SP, чем вмещает колба. Сгорают все свободные SP. Очки, вложенные в навыки, сохраняются.', source: 'Обычная Лавка · монеты' },
      { name: 'Колба на 100 000 SP', file: 'flask-half.webp', effect: 'Содержит 100 000 очков навыков. Для записи нужно 200 000 SP.', source: 'Хранение очков навыков' },
      { name: 'Колба на 1 000 000 SP', file: 'flask-full.webp', effect: 'Содержит 1 000 000 очков навыков. Для записи нужно 2 000 000 SP.', source: 'Хранение очков навыков' },
      { name: 'Ваучер 10 000 $NOT', file: 'voucher-10k.webp', effect: 'Номинал — 10 000 $NOT.', source: 'Ваучер' },
      { name: 'Ваучер 100 000 $NOT', file: 'voucher-100k.webp', effect: 'Номинал — 100 000 $NOT.', source: 'Ваучер' },
    ],
  },
  decor: {
    title: 'Оформление', icon: 'birch.webp', summary: 'Гирлянды, деревья и фон совы',
    items: [
      { name: 'Цветная гирлянда', file: 'string-light-color.webp', effect: 'Включает разноцветные огни на дереве совы.', source: 'Добыча из яиц' },
      { name: 'Белая гирлянда', file: 'string-lights.webp', effect: 'Включает белые огни на дереве совы.', source: 'Добыча из яиц' },
      { name: 'Берёзовая кора', file: 'birch.webp', effect: 'Заменяет внешний вид дерева на домашнем экране.', source: 'Добыча из яиц' },
      { name: 'Дубайский шоколад', file: 'dubai-chocolate.webp', effect: 'Переносит гнездо совы на небоскрёб в Дубае.', source: 'Добыча из яиц' },
      { name: 'Ветка Эмпайр-стейт', file: 'new-york.webp', effect: 'Переносит гнездо совы на небоскрёб в Нью-Йорке.', source: 'Фон для совы' },
    ],
  },
};

const jettons: CatalogItem[] = [
  { name: 'Обычный жетон', file: 'skin-jetton.webp', effect: 'Случайное оперение.', source: 'Жетон скина' },
  { name: 'Эпический жетон', file: 'skin-jetton-epic.webp', effect: 'Оперение и несколько случайных аксессуаров.', source: 'Жетон скина' },
  { name: 'Золотой жетон', file: 'skin-jetton-golden.webp', effect: 'Эпический скин с золотым оперением.', source: 'Жетон скина' },
  ...[25, 26, 27].map(id => {
    const [name, file] = itemNames[id];
    return { name, file, effect: 'Добавляет сове особый след в полёте.', source: 'Жетон скина · яйцо' };
  }),
];

function lootDestination(id: number, file: string) {
  if ([25, 26, 27].includes(id)) return '/owl/skins#jetton-' + id;
  return Object.values(categories).some(category => category.items.some(item => item.file === file))
    ? '/assets/item/' + file.split('.')[0] : undefined;
}

function SkinCatalog() {
  return <section className="card">
    <SkinExamples/>
    <h2>Жетоны</h2>
    <ul className="compactList">{jettons.map(item =>
      <InventoryRow item={item} key={item.file} id={/^\d/.test(item.file) ? 'jetton-' + item.file.split('.')[0] : undefined}/>)}</ul>
    <details className="plainDisclosure"><summary>Все детали скинов</summary>
      {([
        ['body', 'Оперение'], ['hat', 'Головные уборы'], ['glasses', 'Очки'],
        ['chest', 'Украшения на груди'], ['eyes', 'Глаза'],
      ] as const).map(([slot, label]) => <p key={slot}><strong>{label} · </strong>{skinParts[slot].join(', ')}</p>)}
    </details>
  </section>;
}

function InventoryRow({ item, id }: { item: CatalogItem; id?: string }) {
  const key = ({
    'rogach.webp': 'beetle', 'big-black-clock.webp': 'clock', 'flask-empty.webp': 'flask-sp',
    'floppy-empty.webp': 'floppy-xp',
  }[item.file] ?? item.file.split('.')[0]);
  const offer = shopItems.find(offer => offer.id === key);
  const level = offer?.required_level ?? (offer?.category === 'ring' ? 5 : undefined);
  return <li className="inventoryRow" id={id}>
    <GameArt path={itemPath(item.file)} size={36}/>
    <div><h3>{item.name}</h3><p>{item.effect}</p>
      {level ? <small>С {level}-го уровня</small> : !offer && <small>{item.source}</small>}</div>
    {offer && <Price value={offer.price} currency={offer.currency === 'stars' ? 'stars' : 'coins'}/>}
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
        {id === 'gear' && !category && <Link className="textLink" to="/assets/gear">Заточка и NFT</Link>}
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
  return <section className="card">
    <h2>Шансы заточки</h2><p>Улучшение до +3 гарантировано. Шанс заточки до +4 — 95%, до +5 — 90%. Каждая следующая ступень уменьшает шанс ещё на 5 из 100.</p>
    <details><summary>Шанс на каждой ступени</summary><table className="priceTable">
      <thead><tr><th scope="col">Целевая заточка</th><th scope="col">Шанс</th><th scope="col">Бонус к фарму</th></tr></thead>
      <tbody>{Array.from({ length: 20 }, (_, i) => <tr key={i}>
        <th scope="row">+{i + 1}</th><td>{100 - Math.max(0, i - 2) * 5}%</td><td>+{(i + 1) * 5}%</td>
      </tr>)}</tbody>
    </table></details>
  </section>;
}
