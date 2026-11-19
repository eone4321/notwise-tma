import { collectionMarket } from './marketData';
import { Link, useLocation } from 'react-router';
import stickers from '../../public/data/all_100_stickers.json';
import marketPacks from '../../public/data/stickers.json';
import { GameArt } from '../ui/GameArt';
import { achievementActions } from './inventory';
import { ProgressStatus, useProgress } from './GuideProgress';
import marketCollections from './market-collections.json';

const albums = ['Wonderland','Flying Saucer','Cosmo Zone','Summer Vibes','Wild Fortune','Hellborn','Mimizuku','Showtime','Power Mode','Naughty Mood','Hustle Pack','Spellbound','Wanted Sheriff','Internet Moments','Laa-Laa Land','Fine Art','The Family','GG Pack','Golden Scarab','Back to School'];
const themes: Record<string, string> = { Showtime: 'Сцена и иллюзии' };

const purpose: Record<string, string> = {
  genesis: 'Первая NFT-коллекция сов, с которой начался проект NOT Wise.',
  eggs: 'Отдельная коллекция NFT-яиц на TON. Раньше их сжигали, чтобы получить яйцо в игре. Доступность обмена сейчас не подтверждена.',
  owlings: 'Юбилейная NFT-коллекция к первой годовщине NOT Wise.',
  classics: 'Коллекционный Telegram-стикерпак из Sticker Pad.',
  domains: 'Имена третьего уровня на TON, привязанные к домену notwise.ton.',
  merch: 'NFT, которые выпустили для обмена на физический мерч NOT Wise.',
  items: 'Кольца, артефакты и расходники, выпущенные как NFT из инвентаря игры.',
  skins: 'NFT-скины для сов. Экипированные детали добавляют бонус к дропу $NOT.',
  family: 'Отдельная коллекция Not Wise Family на TON.',
};

const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const stickerAlbum = (id: number) => Math.ceil(id / 5);

export function CollectionPage() {
  const { pathname, hash, state } = useLocation();
  const { collected, completed, setMark } = useProgress();
  const isDone = (id: number) => collected.includes(id) || completed.includes(id);
  const albumNumber = Number(pathname.match(/albums\/(\d+)$/)?.[1]);
  const album = albumNumber >= 1 && albumNumber <= albums.length ? albumNumber : null;
  const marketView = pathname === '/collections/market';
  const { data: market, pending } = collectionMarket.useSnapshot();

  const matches = album === null ? [] : stickers.filter(item => stickerAlbum(item.id) === album);
  const count = album === null ? stickers.filter(item => isDone(item.id)).length : matches.filter(item => isDone(item.id)).length;
  const title = album === null ? '' : albums[album - 1];
  const theme = themes[title] ?? marketPacks.packs.find(pack => pack.name === 'NOT Wise: ' + title)?.theme;
  const total = album === null ? stickers.length : matches.length;
  return <>
    {album === null && <nav className="choiceBar" aria-label="Раздел коллекций">
      <Link to="/collections" aria-current={!marketView ? 'page' : undefined}>Стикеры</Link>
      <Link to="/collections/market" state={{ returnTo: state?.returnTo ?? '/collections' }} aria-current={marketView ? 'page' : undefined}>NFT на Getgems</Link>
    </nav>}
    {marketView ? <section className="card marketCollections" aria-busy={!market && pending}>
      {marketCollections.map(item => {
        const quote = market?.items.find(row => row.id === item.id);
        const floor = quote?.floor;
        return <details className="mediaDetails marketCollection" key={item.id} id={item.id} open={hash === "#" + item.id || undefined}>
          <summary>
            <GameArt path={'/brand/collections/' + item.id + '.png'} size={42}/>
            <span><strong>{item.name}</strong>
              <small>{!market && pending ? 'Загружаем флор…' : floor && floor > 0
                ? <span className="floorPrice" title={quote?.available === false ? 'Последняя доступная цена' : undefined}>от {format.format(floor)} <GameArt path="/brand/tokens/gram.png" size={15}/> GRAM</span>
                : 'Флор недоступен'}</small></span>
          </summary>
          <p>{purpose[item.id]}</p>
          {typeof quote?.supply === 'number' && <small>Выпущено {format.format(quote.supply)} NFT в коллекции</small>}
          <div><a className="textLink" href={`https://getgems.io/collection/${item.address}`} target="_blank" rel="noreferrer">Открыть на Getgems</a></div>
          {item.id === 'genesis' && <a className="textLink" href="https://t.me/NotWiseGuideBot?start=owl_sales">Уведомления о продажах</a>}
        </details>;
      })}
    </section> : <>
      {album === null ? <>
        <ProgressCount count={count} total={total}/>
        <ProgressStatus/>
        <div className="albumNoticeCard card">
          <div className="albumNoticeHeader">
            <span className="albumNoticeIcon" aria-hidden="true">💎</span>
            <div>
              <strong>Ончейн-мониторинг минта (лимит 500 шт. на альбом)</strong>
              <p>Парсер отслеживает фактически сминченные NFT-альбомы на блокчейне TON (Getgems).</p>
            </div>
          </div>
          <p className="albumNoticeDesc">
            В игре у некоторых альбомов может быть уже 498/500, но в блокчейне они появляются с задержкой:
            покупка за Telegram Stars накладывает <strong>21-дневный кулдаун</strong> (холд) на минт,
            а также требуется выпустить пак в Telegram перед отправкой транзакции. Как только NFT подтверждается в сети TON, парсер автоматически вычитает её из остатка.
          </p>
        </div>
        <div className="albumGrid">{albums.map((label, index) => {
          const pack = index + 1;
          const found = stickers.filter(item => stickerAlbum(item.id) === pack && isDone(item.id)).length;
          return <Link key={label} to={`/collections/albums/${pack}`}>
            <GameArt path={`/game/albums/${pack}.webp`} size={45}/>
            <strong>{label}</strong>
            <small>{found}/5 · осталось {5 - found}</small>
            <span className="albumMintBadge">500/500 NFT</span>
          </Link>;
        })}</div>
      </> : <section className="card stickerCollection">
        <div className="mediaHeading"><GameArt path={`/game/albums/${album}.webp`} size={46}/><div>
          <h2>{title}</h2>{theme && <p>{theme}</p>}
        </div></div>
        <ProgressCount count={count} total={total}/>
        <ProgressStatus/>
        {matches.map(item => <div className="stickerProgressRow" key={item.id}>
          <details className="mediaDetails" open={state?.stickerId === item.id || undefined}><summary>
            <GameArt path={`/game/stickers/${item.id}.webp`} size={34}/>
            <span><strong>{item.name}</strong><small>{item.kind === 'secret' ? 'Секрет' :
              item.kind === 'achievement' ? 'Достижение' : 'Набор стикеров'}</small></span>
          </summary>
          {item.kind === 'secret' ? <Link className="textLink" to={`/secrets#sticker-${item.id}`} state={{ returnTo: pathname }}>Условие секрета</Link> :
            <p>{achievementActions[item.id] ?? 'Может выпасть при открытии набора стикеров.'}</p>}
          </details>
          <label className="secretCheck"><input type="checkbox" checked={isDone(item.id)}
            onChange={event => setMark('collected', item.id, event.target.checked)}/>
            <span className="sr-only">Собран: {item.name}</span></label>
        </div>)}
        <details className="mediaDetails guideDisclosure" open={state?.mintOpen || undefined}>
          <summary>
            <GameArt path="/brand/collections/classics.png" size={34}/>
            <span><strong>Ончейн-минт NFT альбома</strong><small>Лимит 500 шт. · 500/500 доступно</small></span>
          </summary>
          <div className="albumMintInfo">
            <p>
              Сбор всех 5 стикеров альбома даёт право выпустить официальный NFT-стикерпак на блокчейне TON.
              Лимит каждого альбома строго ограничен <strong>500 NFT</strong>.
            </p>
            <div className="albumCooldownAlert">
              <strong>⏳ Кулдаун 21 день и ончейн-статус:</strong>
              <p>
                Мы парсим <strong>фактически сминченные NFT</strong> в сети TON на Getgems. В игре у альбома может отображаться меньше 500 доступных копий (например, 498/500), если игроки собрали пак, но ещё не сминтили его на блокчейне.
              </p>
              <p>
                Причина — <strong>21-дневный кулдаун</strong>: компоненты, полученные или купленные за Telegram Stars, заморожены для ончейн-минта на 21 день (<em>«a purchase for Telegram Stars holds it for 21 days»</em>). Также перед минтом требуется создать пак в Telegram.
              </p>
              <p>
                Как только NFT подтверждается в блокчейне TON, парсер автоматически фиксирует её и счётчик уменьшается (например, 499/500).
              </p>
            </div>
            <a className="textLink spacedLink" href="https://getgems.io/collection/EQAh0jRY7l_jw7o2lI8N5Bl0bFo-5eOKYinsZ56ZRcKABnup" target="_blank" rel="noreferrer">
              Коллекция стикерпаков на Getgems
            </a>
          </div>
        </details>
      </section>}
    </>}
  </>;
}

function ProgressCount({ count, total }: { count: number; total: number }) {
  return <div className="progressCounts">
    <strong>Собрано {count}/{total}</strong><span>Осталось {total - count}</span>
  </div>;
}
