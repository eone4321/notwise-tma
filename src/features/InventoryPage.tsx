import { Link, useLocation } from 'react-router';
import { GameArt } from '../ui/GameArt';
import { chanceLabel } from '../domain/mechanics';
import market from './market-collections.json';
import { dropsFor, itemNames } from './inventory';
import { OwlPrices } from './OwlPrices';

const eggs = [
  { id: 17, slug: 'mystery', name: 'Загадочное', source: 'Выпадает из капсул', details: 'Чаще всего выпадает еда. В пуле также лекарства, декор и редкие награды.' },
  { id: 19, slug: 'red', name: 'Белое', source: 'Красная карточка', details: 'У этого яйца другой пул: больше осколков и редких наград, из еды есть пчела и кузнечик.' },
  { id: 18, slug: 'green', name: 'Бежевое', source: 'Зелёная карточка', details: 'Из этого яйца выпадают декор, жетон скина и другие награды. Еды в пуле нет.' },
  { id: 20, slug: 'gold', name: 'Белое', source: 'Золотая карточка', details: 'Пул похож на яйцо в зелёной карточке, но в нём другой жетон скина.' },
] as const;

export function OwlPage() {
  const { pathname } = useLocation();
  const egg = eggs.find(item => pathname === '/owl/' + item.slug);
  const care = pathname === '/owl/care';
  const drops = egg ? dropsFor(egg.id) : [];
  const unknownChance = drops.reduce((sum, [id, chance]) => sum + (itemNames[id] ? 0 : chance), 0);
  return <>
    {!egg && !care && <>
      <p className="intro">Найди яйцо по картинке и цвету карточки в инвентаре.</p>
      <div className="eggPicker" aria-label="Виды яиц">
        {eggs.map(item => <Link to={'/owl/' + item.slug} className="catalogTile" key={item.id}>
          <GameArt path={itemPath(item.id + '.png')} size={56}/>
          <strong>{item.name} яйцо</strong><small>{item.source}</small>
        </Link>)}
      </div>
      <OwlPrices only="eggs"/>
      <Link className="card sectionLink" to="/owl/care">
        <GameArt path={itemPath('croissant.webp')} size={44}/><span><strong>Кормление совы</strong><small>Сытость, любимая еда и штраф за голод</small></span>
      </Link>
    </>}
    {egg && <section className="card">
      <div className="mediaHeading"><GameArt path={itemPath(egg.id + '.png')} size={64}/>
        <div><h2>{egg.name} яйцо</h2><p>{egg.source}</p></div>
      </div>
      <p>{egg.details}</p>
      <h3>Шанс за один бросок</h3>
      <p className="caption">За открытие выпадает 1 предмет в 80% случаев, 2 — в 15%, 3 — в 5%. Редкие шансы округлены.</p>
      <ul className="compactList lootList">
        {drops.filter(([id]) => itemNames[id]).map(([id, chance]) => {
          const [name, file] = itemNames[id];
          return <li className="mediaRow" key={id}>
            <GameArt path={itemPath(file)} size={36}/><span>{name}</span><strong>{chanceLabel(chance)}</strong>
          </li>;
        })}
        {unknownChance > 0 && <li className="mediaRow">
          <span>Награды без подтверждённых названий</span><strong>{chanceLabel(unknownChance)}</strong>
        </li>}
      </ul>
      <p className="caption">Пул из клиента игры. Текущие цены и награды смотри при выборе яйца в игре.</p>
    </section>}
    {care && <section className="card">
      <div className="mediaHeading"><GameArt path={itemPath('croissant.webp')} size={52}/>
        <div><h2>Как избежать голода</h2><p>Покорми сову хотя бы раз в три дня.</p></div>
      </div>
      <ul className="compactList">
        <li className="mediaRow"><span>Максимум сытости</span><strong>20</strong></li>
        <li className="mediaRow"><span>Любимая еда</span><strong>×2 сытости</strong></li>
        <li className="mediaRow"><span>Время штрафа</span><strong>24 ч</strong></li>
        <li className="mediaRow"><span>Монеты, XP, восстановление HP и энергии при голоде</span><strong>−50%</strong></li>
      </ul>
      <Link className="textLink" to="/assets/care">Еда и лекарства</Link>
    </section>}
  </>;
}

const itemPath = (file: string) => '/game/items/' + file;

type CatalogItem = { name: string; file: string; effect: string; source: string };
type Category = { title: string; icon: string; summary: string; items: CatalogItem[] };

const categories: Record<string, Category> = {
  care: {
    title: 'Еда и лекарства', icon: 'croissant.webp', summary: 'Сытость, здоровье и снятие штрафа',
    items: [
      ...[5, 6, 7, 8, 15, 16, 24].map(id => ({
        name: itemNames[id][0], file: itemNames[id][1], effect: 'Восстанавливает сытость. Любимая еда даёт ×2. Порция указана на карточке в игре.',
        source: 'Добыча из яиц. Часть еды есть в Лавке за монеты.',
      })),
      { name: 'Груша', file: 'pear.webp', effect: 'Восстанавливает сытость. Может быть любимой едой совы.', source: 'Еда' },
      { name: 'Круассан', file: 'croissant.webp', effect: 'Восстанавливает сытость. Может быть любимой едой совы.', source: 'Обычная Лавка · монеты' },
      { name: 'Пластырь и аптечка', file: 'first-aid-kit.webp', effect: 'Восстанавливают здоровье. Сколько HP даёт предмет, указано в его карточке.', source: 'Добыча из яиц' },
      { name: 'Таблетка восстановления', file: 'recovery-pill.webp', effect: 'Снимает штраф голода. Повторное применение через 7 дней.', source: 'Расходник' },
    ],
  },
  gear: {
    title: 'Кольца и артефакты', icon: 'ring-wit-3.webp', summary: 'Атрибуты и бонус к $NOT',
    items: [
      { name: 'Кольца', file: 'ring-wit-3.webp', effect: 'Три слота. Есть кольца силы, ловкости и мудрости. У каждого вида три ступени. Точный бонус виден в карточке кольца.', source: 'Инвентарь и рынок NFT' },
      { name: 'Артефакты', file: 'book.webp', effect: 'Один слот. Книга, кристалл и другие артефакты могут давать очки фарма. Каждое очко прибавляет 5 п. п. к бонусу выпадения $NOT.', source: 'Редкая добыча из яиц' },
      { name: 'Заточка', file: 'enchanter.webp', effect: 'Есть свитки для скинов и для колец, а также универсальная заточка. Каждый +1 даёт 5 п. п. к бонусу фарма.', source: 'Премиальная Лавка и крафт' },
      { name: 'Жетоны скинов', file: '26.png', effect: 'Открой жетон, чтобы получить скин. Обычная деталь даёт +5 п. п. к бонусу фарма, золотое тело +15, цепь NOT +10.', source: 'Редкая добыча из яиц' },
    ],
  },
  craft: {
    title: 'Крафт и хранение XP', icon: 'eggshell-shards-icon.webp', summary: 'Скорлупа, дискеты опыта и колбы SP',
    items: [
      { name: 'Осколки скорлупы', file: 'eggshell-shards-icon.webp', effect: 'Из осколков можно собрать яйца и другие награды. Цена в осколках зависит от рецепта.', source: 'Яйца и капсулы · рецепты в инвентаре' },
      { name: 'Дискеты опыта', file: 'floppy-empty.webp', effect: 'Вместимость: 100 тыс., 1 млн, 10 млн, 100 млн и 1 млрд XP. Для записи нужно вдвое больше XP, чем вмещает дискета.', source: 'Хранение и перенос опыта' },
      { name: 'Зажигалка сквада', file: 'lighter.webp', effect: 'Один заряд позволяет благословить сквад в ежедневном ритуале. Когда ритуалы выполнят 50% сквада, участники получают бонус на 24 часа.', source: 'Добыча из яиц' },
      { name: 'Колбы SP', file: 'flask-full.webp', effect: 'Хранят очки навыков. Ёмкость и уровень для покупки указаны в Лавке.', source: 'Обычная Лавка · монеты' },
    ],
  },
  decor: {
    title: 'Оформление', icon: 'birch.webp', summary: 'Гирлянды, деревья и фон совы',
    items: [
      { name: 'Гирлянды', file: '12.png', effect: 'Цветная и белая версии. Украшают дерево совы.', source: 'Добыча из яиц' },
      { name: 'Берёзовая кора', file: 'birch.webp', effect: 'Заменяет внешний вид дерева на домашнем экране.', source: 'Добыча из яиц' },
      { name: 'Фоны', file: 'new-york.webp', effect: 'Меняют пейзаж вокруг совы, например на Нью-Йорк.', source: 'Инвентарь' },
    ],
  },
};

export function InventoryPage() {
  const { pathname } = useLocation();
  const slug = pathname.split('/')[2];
  const category = Object.hasOwn(categories, slug) ? categories[slug] : undefined;
  return category ? <>
    <h2 className="subTitle">{category.title}</h2>
    <section className="card">
      {category.items.map(item => <details className="mediaDetails" key={item.name}>
        <summary><GameArt path={itemPath(item.file)} size={40}/><span><strong>{item.name}</strong><small>{item.source}</small></span></summary>
        <p>{item.effect}</p>
        {item.name === 'Кольца' && <div className="ringVariants">
          {[['str', 'Сила'], ['ag', 'Ловкость'], ['wit', 'Мудрость']].map(([key, name]) => <div key={key}>
            <small>{name}</small>
            <div>{[1, 2, 3].map(tier => <GameArt key={tier} path={itemPath(`ring-${key}-${tier}.webp`)} size={38}/>)}</div>
          </div>)}
        </div>}
      </details>)}
    </section>
    {slug === 'gear' && <>
      <EnchantGuide/>
      <a className="textLink" href={'https://getgems.io/collection/' + market.find(item => item.id === 'items')?.address}
        target="_blank" rel="noreferrer">Цены на NFT-предметы в Getgems</a>
    </>}
    <p className="caption">Ассортимент, цены и часть параметров приходят с сервера игры.</p>
  </> : <>
    <p className="intro">Выбери категорию, чтобы узнать, что даёт предмет и где его взять.</p>
    <div className="catalogGrid">{Object.entries(categories).map(([id, entry]) =>
      <Link className="catalogTile" key={id} to={'/assets/' + id}>
        <GameArt path={itemPath(entry.icon)} size={46}/><strong>{entry.title}</strong><small>{entry.summary}</small>
      </Link>)}</div>
  </>;
}

function EnchantGuide() {
  return <section className="card">
    <h2>Шансы заточки</h2><p>Улучшение до +3 гарантировано. С +4 шанс падает на 5 п. п. за попытку следующей ступени.</p>
    <details><summary>Шанс на каждой ступени</summary><table className="priceTable">
      <thead><tr><th scope="col">Целевая заточка</th><th scope="col">Шанс</th><th scope="col">Бонус к фарму</th></tr></thead>
      <tbody>{Array.from({ length: 20 }, (_, i) => <tr key={i}>
        <th scope="row">+{i + 1}</th><td>{100 - Math.max(0, i - 2) * 5}%</td><td>+{(i + 1) * 5} п. п.</td>
      </tr>)}</tbody>
    </table></details>
  </section>;
}
