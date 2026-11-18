import { Link, useLocation } from 'react-router';
import { GameArt } from '../ui/GameArt';
import { chanceLabel } from '../domain/mechanics';
import { dropsFor, itemNames } from './inventory';
import { OwlPrices } from './OwlPrices';
import { shopPrice } from './shop';
import shopItems from './shop-data.json';
import skinParts from './skin-parts.json';

const eggs = [
  { id: 17, slug: 'mystery', name: 'Загадочное', source: 'Выпадает из капсул', details: 'Чаще всего выпадает еда. В пуле также лекарства, декор и редкие награды.' },
  { id: 19, slug: 'red', name: 'Золотое загадочное', source: 'Красная карточка · сезонный топ-10', details: 'У этого яйца другой пул: больше осколков и редких наград, из еды есть пчела и кузнечик.' },
  { id: 56, slug: 'season', name: 'Сезонное загадочное', source: 'Места 11–100', details: 'Базовая награда сезона. По сравнению с яйцом из капсул в пуле есть больше редких наград и меньше вариантов еды.' },
  { id: 18, slug: 'green', name: 'Бежевое', source: 'Зелёная карточка', details: 'Из этого яйца выпадают декор, жетон скина и другие награды. Еды в пуле нет.' },
  { id: 20, slug: 'gold', name: 'Белое', source: 'Золотая карточка', details: 'Пул похож на яйцо в зелёной карточке, но в нём другой жетон скина.' },
] as const;

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
  return <>
    {!egg && !care && <>
      <p className="intro">В Лавке три предложения: одно за монеты и два за Stars. Каталог дропа включает также яйца, которые дают за сезон и другие игровые источники.</p>
      <div className="eggPicker" aria-label="Виды яиц">
        {eggs.map(item => <Link to={'/owl/' + item.slug} className="catalogTile" key={item.id}>
          <GameArt path={itemPath(item.id === 56 ? 'egg.webp' : item.id + '.png')} size={56}/>
          <strong>{item.name} яйцо</strong><small>{item.source}</small>
        </Link>)}
      </div>
      <section className="card">
        <h2>Яйца в Лавке</h2>
        <div className="mediaRow"><GameArt path={itemPath('egg.webp')} size={36}/><span>Загадочное</span><strong>{shopPrice('egg')} / {shopPrice('egg-stars')}</strong></div>
        <div className="mediaRow"><GameArt path={itemPath('golden-egg.webp')} size={36}/><span>Золотое яйцо</span><strong>{shopPrice('golden-egg')}</strong></div>
      </section>
      <OwlPrices only="eggs"/>
      <section className="card">
        <div className="mediaHeading"><GameArt path={itemPath('referral-egg.webp')} size={44}/>
          <div><h2>Реферальное яйцо</h2><p>Вместе с яйцом игра даёт 5 000 монет за вход по игровой ссылке друга.</p></div>
        </div>
      </section>
      <Link className="card sectionLink" to="/owl/care">
        <GameArt path={itemPath('croissant.webp')} size={44}/><span><strong>Кормление совы</strong><small>Сытость, любимая еда и штраф за голод</small></span>
      </Link>
    </>}
    {egg && <section className="card">
      <div className="mediaHeading"><GameArt path={itemPath(egg.id === 56 ? 'egg.webp' : egg.id + '.png')} size={64}/>
        <div><h2>{egg.name} яйцо</h2><p>{egg.source}</p></div>
      </div>
      <p>{egg.details}</p>
      {egg.id === 17 && <p><strong>Лавка: {shopPrice('egg')} или {shopPrice('egg-stars')}</strong></p>}
      <h3>Шанс за открытие</h3>
      <p className="caption">Шанс получить награду хотя бы раз. За открытие выпадает 1 предмет в 80% случаев, 2 — в 15%, 3 — в 5%.</p>
      <ul className="compactList lootList">
        {drops.filter(([id]) => itemNames[id]).map(([id, chance]) => {
          const [name, file] = itemNames[id];
          return <li className="mediaRow" key={id}>
            <GameArt path={itemPath(file)} size={36}/><span>{name}</span><strong>{chanceLabel(openingChance(chance))}</strong>
          </li>;
        })}
        {unknownChance > 0 && <li className="mediaRow">
          <span>Хотя бы одна награда без подтверждённого названия</span><strong>{chanceLabel(openingChance(unknownChance))}</strong>
        </li>}
      </ul>
      <details><summary>Почему шанс не гарантирует награду?</summary>
        <p>Каждое открытие независимо. «1 из 100» — средняя частота выпадения за много попыток. Награда может выпасть дважды подряд или долго не выпадать.</p>
      </details>
      <p className="caption">Базовые шансы из клиента. Текущую цену показывает карточка яйца в игре.</p>
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

const itemPath = (file: string) => '/game/items/' + file;

type CatalogItem = { name: string; file: string; effect: string; source: string };
type Category = { title: string; icon: string; summary: string; items: CatalogItem[] };

const floppySpecs = [
  ['100k', '100 000', '200 000'], ['1m', '1 млн', '2 млн'],
  ['10m', '10 млн', '20 млн'], ['100m', '100 млн', '200 млн'], ['1b', '1 млрд', '2 млрд'],
] as const;

const categories: Record<string, Category> = {
  care: {
    title: 'Еда и лекарства', icon: 'croissant.webp', summary: 'Сытость, здоровье и снятие штрафа',
    items: [
      ...[5, 6, 7, 8, 15, 16].map(id => ({
        name: itemNames[id][0], file: itemNames[id][1], effect: 'Восстанавливает сытость. Любимая еда даёт двойную сытость.',
        source: 'Добыча из яиц. Часть еды есть в Лавке за монеты.',
      })),
      { name: 'Рогач', file: 'rogach.webp', effect: 'Съедобный жук. Повышает сытость совы.', source: 'Еда' },
      { name: 'Seba Cola', file: 'seba-cola.webp', effect: 'Защищает сову от рейдов и подбора в соперники. Если сова сама нападёт, защита спадёт. Длительность указана в игре.', source: 'Защита от атак' },
      { name: 'Большие чёрные часы', file: 'big-black-clock.webp', effect: 'Блокируют новый штраф за голод на 30 дней. Действующий штраф закончится по своему таймеру. Каждые часы добавляют ещё 30 дней защиты.', source: 'Защита от голода' },
      { name: 'Груша', file: 'pear.webp', effect: 'Восстанавливает сытость. Может быть любимой едой совы.', source: 'Еда' },
      { name: 'Круассан', file: 'croissant.webp', effect: 'Восстанавливает сытость. Может быть любимой едой совы.', source: 'Обычная Лавка · монеты' },
      { name: 'Пластырь', file: 'patch.webp', effect: 'Восстанавливает здоровье.', source: 'Лечение · яйцо' },
      { name: 'Аптечка', file: 'first-aid-kit.webp', effect: 'Восстанавливает здоровье.', source: 'Лечение · яйцо' },
      { name: 'Таблетка восстановления', file: 'recovery-pill.webp', effect: 'Снимает штраф голода и полностью восстанавливает сытость. Можно использовать раз в 7 дней.', source: 'Расходник' },
    ],
  },
  gear: {
    title: 'Кольца и артефакты', icon: 'ring-wit-3.webp', summary: 'Атрибуты и бонус к $NOT',
    items: [
      { name: 'Кольца', file: 'ring-wit-3.webp', effect: 'Три слота. Есть кольца силы, ловкости и мудрости. У каждого вида три ступени. Точный бонус виден в карточке кольца.', source: 'Инвентарь и рынок NFT' },
      ...([
        ['Эпическая книга исследователей', 'book.webp'], ['Монтмориллонит', 'montmorillonite.webp'],
      ] as const).map(([name, file]) => ({
        name, file, effect: file === 'book.webp'
          ? 'Открывает ежедневную загадку. На ответ 60 секунд. Верный ответ даёт монеты, опыт и +5 мудрости на сутки. Три ошибки уничтожают книгу.'
          : 'Кристалл ускоряет восстановление здоровья. Размер бонуса указан на карточке в игре.', source: 'Артефакт',
      })),
      { name: 'Заточка', file: 'enchanter.webp', effect: 'Есть свитки для скинов и для колец, а также универсальная заточка. Каждый +1 даёт 5 п. п. к бонусу фарма.', source: 'Премиальная Лавка и крафт' },
    ],
  },
  skins: {
    title: 'Скины и жетоны', icon: 'skin-jetton.webp', summary: 'Типы жетонов и бонус к выпадению $NOT',
    items: [
      ...([
        ['Обычный жетон', 'skin-jetton.webp'], ['Эпический жетон', 'skin-jetton-epic.webp'],
        ['Золотой жетон', 'skin-jetton-golden.webp'],
      ] as const).map(([name, file]) => ({
        name, file, effect: 'Открой жетон, чтобы получить скин. Обычная деталь даёт +5 п. п. к бонусу фарма, золотое тело +15, цепь NOT +10.', source: 'Жетон скина',
      })),
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
      { name: 'Нью-Йорк', file: 'new-york.webp', effect: 'Городской фон с дневным и ночным освещением. В клиенте также предусмотрены стандартный лес и фон Дубая.', source: 'Фон для совы' },
    ],
  },
};

export function InventoryPage() {
  const { pathname } = useLocation();
  const slug = pathname.split('/')[2];
  const category = Object.hasOwn(categories, slug) ? categories[slug] : undefined;
  const shopKey = (file: string) => ({
    'rogach.webp': 'beetle', 'big-black-clock.webp': 'clock', 'flask-empty.webp': 'flask-sp',
    'floppy-empty.webp': 'floppy-xp',
  }[file] ?? file.split('.')[0]);
  const renderCategory = (entry: Category) => <ul className="compactList">
    {entry.items.flatMap(item => item.file === 'ring-wit-3.webp' ? shopItems
      .filter(offer => offer.category === 'ring').map(offer => ({
        name: offer.name_ru, file: offer.id + '.webp', effect: 'Повышает характеристику кольца. Можно заточить.', source: 'Лавка',
      })) : [item]).map(item => <li className="mediaRow inventoryRow" key={item.file}>
        <GameArt path={itemPath(item.file)} size={42}/>
        <div><h3>{item.name}</h3><p>{item.effect}</p>
          <small className="inventoryPrice">
            {shopPrice(shopKey(item.file)).includes('монет') && <GameArt path="/game/items/wise-coin.webp" size={16}/>}
            {shopPrice(shopKey(item.file)) || item.source}
          </small></div>
      </li>)}
  </ul>;
  return <>
    {(category ? [[slug, category] as const] : Object.entries(categories)).map(([id, entry]) =>
      <details className="card inventorySection" key={id} open={category !== undefined || undefined}>
        <summary><GameArt path={itemPath(entry.icon)} size={34}/><strong>{entry.title}</strong></summary>
        {id === 'skins' && <p>Жетоны выпадают из яиц. Открыв жетон, ты получаешь скин. Экипированные детали скина повышают шанс получить $NOT из капсул.</p>}
        {renderCategory(entry)}
        {id === 'skins' && <details><summary>Детали скинов</summary>
          {([
            ['body', 'Оперение'], ['hat', 'Головные уборы'], ['glasses', 'Очки'],
            ['chest', 'Украшения на груди'], ['eyes', 'Глаза'],
          ] as const).map(([slot, label]) => <p key={slot}><strong>{label}:</strong> {skinParts[slot].join(', ')}</p>)}
        </details>}
        {id === 'gear' && !category && <Link className="textLink" to="/assets/gear">Заточка и NFT</Link>}
      </details>)}
    {slug === 'gear' && <>
      <EnchantGuide/>
      <OwlPrices only="items"/>
    </>}
    <p className="caption">Цены приведены по данным Лавки из файла игры. В игре они могут измениться.</p>
    {slug === 'gear' && <section className="card">
      <details><summary>Как предмет становится NFT</summary>
        <p>При выпуске NFT предмет уходит из инвентаря и появляется в кошельке. Его можно продать или вернуть в игру. Покупка за Stars может закрыть выпуск на 21 день.</p>
      </details>
    </section>}

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
