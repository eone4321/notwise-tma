import { collectionMarket } from './marketData';
import { Link, useLocation } from 'react-router';
import stickers from '../../public/data/all_100_stickers.json';
import marketPacks from '../../public/data/stickers.json';
import { GameArt } from '../ui/GameArt';
import { GameGlyph } from '../ui/GameGlyph';
import { AlbumLogo } from '../ui/AlbumLogo';
import { achievementActions } from './inventory';
import { ProgressStatus, useProgress } from './GuideProgress';
import marketCollections from './market-collections.json';
import stickerData from './sticker-data.json';
import { chanceLabel, chancePerOpening } from '../domain/mechanics';

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
  skins: 'NFT-скины для сов. Экипированные детали дают бонус к фарму монет.',
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
    {album === null && <nav className="choiceBar profileTabs" aria-label="Раздел коллекций">
      <Link to="/collections" aria-current={!marketView ? 'page' : undefined}><GameGlyph name="gift"/>Стикеры</Link>
      <Link to="/collections/market" state={{ returnTo: state?.returnTo ?? '/collections' }} aria-current={marketView ? 'page' : undefined}><GameGlyph name="treasure"/>NFT на Getgems</Link>
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
                ? <span className="floorPrice" title={quote?.available === false ? 'Последняя доступная цена' : undefined}>от {format.format(floor)} TON</span>
                : 'Флор недоступен'}</small></span>
          </summary>
          <p>{purpose[item.id]}</p>
          {typeof quote?.supply === 'number' && <small>Выпущено {format.format(quote.supply)} NFT в коллекции</small>}
          <div><a className="textLink" href={`https://getgems.io/collection/${item.address}`} target="_blank" rel="noreferrer">Открыть на Getgems</a></div>
          {item.id === 'genesis' && <a className="textLink" href="https://t.me/NotWiseGuideBot?start=owl_sales">Уведомления о продажах</a>}
        </details>;
      })}
      <h2 className="albumMarketHeading">NFT-наборы стикеров</h2>
      {albums.map((title, index) => {
        const id = index + 1;
        const quote = market?.items.find(item => item.id === 'album-' + id);
        return <details className="mediaDetails marketCollection" key={id} id={'album-' + id} open={hash === '#album-' + id || undefined}>
          <summary><AlbumLogo id={id} size={48}/>
            <span><strong>{title}</strong><small>{quote?.floor ? `от ${format.format(quote.floor)} GRAM` : 'Флор недоступен'}</small></span>
          </summary>
          {typeof quote?.supply === 'number' && <p>Выпущено в TON · {format.format(quote.supply)}</p>}
          <p className="caption">{typeof market?.albumIssue?.[id] === 'number'
            ? `Доступно к выпуску в игре · ${format.format(market.albumIssue[id])}`
            : 'Остаток выпуска можно проверить в игре.'}</p>
          <a className="textLink" href={`https://getgems.io/collection/${stickerData.collectionByAlbum[id]}`} target="_blank" rel="noreferrer">Открыть на Getgems</a>
        </details>;
      })}
    </section> : <>
      {album === null ? <>
        <section className="card stickerShelf">
          <ProgressCount count={count} total={total}/>
          <ProgressStatus/>
          <details className="mediaDetails stickerHelp">
            <summary><GameGlyph name="info"/><strong>Как собираются наборы</strong></summary>
            <p>Стикерпак даёт 1–3 стикера. Повторки возможны. Часть карточек выдаётся за секреты и достижения.</p>
            <p>Собери все 5 карточек набора, чтобы открыть его выпуск. Доступность и цену создания набора показывает игра.</p>
          </details>
          <div className="albumGrid">{albums.map((label, index) => {
            const pack = index + 1;
            const found = stickers.filter(item => stickerAlbum(item.id) === pack && isDone(item.id)).length;
            return <Link key={label} to={`/collections/albums/${pack}`}>
              <AlbumLogo id={pack}/>
              <span className="sr-only">{label}, собрано {found} из 5</span>
              <span aria-hidden="true" className={`albumCornerBadge${found === 5 ? ' isComplete' : ''}`}>{found}/5</span>
            </Link>;
          })}</div>
        </section>
      </> : <section className="card stickerShelf stickerCollection">
        <div className="mediaHeading"><AlbumLogo id={album} size={67}/><div>
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
            <p>{achievementActions[item.id] ?? (
              stickerData.oddsById[item.id] > 0
                ? `Шанс получить из одного пака · ${chanceLabel(chancePerOpening(stickerData.oddsById[item.id], stickerData.drawCounts))}`
                : 'Способ получения указан в игре.'
            )}</p>}
          </details>
          <label className="secretCheck"><input type="checkbox" checked={isDone(item.id)}
            onChange={event => setMark('collected', item.id, event.target.checked)}/>
            <span className="sr-only">Собран: {item.name}</span></label>
        </div>)}
        <details className="mediaDetails guideDisclosure" open={state?.mintOpen || undefined}>
          <summary>
            <GameArt path="/brand/collections/classics.png" size={34}/>
            <span><strong>Выпуск NFT-набора</strong><small>Пять карточек · проверка тиража в игре</small></span>
          </summary>
          {(() => {
            const quote = market?.items.find(item => item.id === 'album-' + album);
            return quote?.available || typeof quote?.supply === 'number'
              ? <p>{quote.floor ? `От ${format.format(quote.floor)} GRAM на Getgems. ` : ''}{typeof quote.supply === 'number' && `Выпущено в TON · ${format.format(quote.supply)}.`}</p>
              : null;
          })()}
          {typeof market?.albumIssue?.[album] === 'number' && <p>Доступно к выпуску в игре · {format.format(market.albumIssue[album])}</p>}
          <p>После сбора всех карточек открой набор в игре. Там показано, остались ли места для создания и сколько стоит выпуск. После создания набора его можно выпустить в TON, если минт доступен для твоего набора.</p>
          <a className="textLink spacedLink" href={`https://getgems.io/collection/${stickerData.collectionByAlbum[album]}`}
            target="_blank" rel="noreferrer">Открыть этот набор на Getgems</a>
        </details>
      </section>}
    </>}
  </>;
}

function ProgressCount({ count, total }: { count: number; total: number }) {
  return <div className="stickerProgress">
    <div className="progressCounts"><strong>Собрано {count}/{total}</strong><span>Осталось {total - count}</span></div>
    <progress className="gameProgress" value={count} max={total} aria-label="Собрано стикеров"/>
  </div>;
}
