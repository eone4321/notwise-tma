import { DetailLink } from '../ui/DetailLink';
import publishing from '../domain/game-publishing.json';
import { Price } from './Price';
import { collectionMarket } from './marketData';
import { Link, useLocation } from 'react-router';
import stickers from '../../public/data/all_100_stickers.json';
import marketPacks from '../../public/data/stickers.json';
import { GameArt } from '../ui/GameArt';
import { GameGlyph } from '../ui/GameGlyph';
import { AlbumLogo } from '../ui/AlbumLogo';
import { achievementActions } from './inventory';
import { ProgressStatus, useProgress } from './GuideProgress';
import marketCollections from './market-collections';
import stickerData from './sticker-data';
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
  const { pathname, hash } = useLocation();
  const { collected, completed, setMark } = useProgress();
  const isDone = (id: number) => collected.includes(id) || completed.includes(id);
  const albumNumber = Number(pathname.match(/albums\/(\d+)$/)?.[1]);
  const album = albumNumber >= 1 && albumNumber <= albums.length ? albumNumber : null;
  const marketView = pathname === '/collections/market';
  const { data: market, pending } = collectionMarket.useSnapshot();

  const matches = album === null ? [] : [...stickers.filter(item => stickerAlbum(item.id) === album)].sort((a, b) => (a.rarity ?? 0) - (b.rarity ?? 0) || a.id - b.id);
  const count = album === null ? stickers.filter(item => isDone(item.id)).length : matches.filter(item => isDone(item.id)).length;
  const quotesById = new Map(market?.items.map(quote => [quote.id, quote]));
  const editionFor = (id: number) => publishing.albums[id - 1];
  const supplyFor = (id: number) => quotesById.get('album-' + id)?.supply;
  const knownSupplies = publishing.albums.map(item => supplyFor(item.id));
  const totalMinted = knownSupplies.every((supply): supply is number => typeof supply === 'number')
    ? knownSupplies.reduce((sum, supply) => sum + supply, 0) : undefined;
  const title = album === null ? '' : albums[album - 1];
  const theme = themes[title] ?? marketPacks.packs.find(pack => pack.name === 'NOT Wise: ' + title)?.theme;
  const total = album === null ? stickers.length : matches.length;
  return <>
    {album === null && <nav className="choiceBar profileTabs" aria-label="Раздел коллекций">
      <Link to="/collections" replace aria-current={!marketView ? 'page' : undefined}><GameGlyph name="gift"/>Стикеры</Link>
      <Link to="/collections/market" replace aria-current={marketView ? 'page' : undefined}><GameGlyph name="treasure"/>NFT на Getgems</Link>
    </nav>}
    {marketView ? <section className="card marketCollections" aria-busy={!market && pending}>
      {marketCollections.map(item => {
        const quote = quotesById.get(item.id);
        const floor = quote?.floor;
        return <details className="mediaDetails marketCollection" key={item.id} id={item.id} open={hash === "#" + item.id || undefined}>
          <summary>
            <GameArt path={'/brand/collections/' + item.id + '.png'} size={42}/>
            <span><strong>{item.name}</strong>
              <small>{!market && pending ? 'Загружаем флор…' : floor && floor > 0
                ? <span className="floorPrice" title={quote?.available === false ? 'Последняя доступная цена' : undefined}><Price value={floor} currency="gram" from/></span>
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
        const quote = quotesById.get('album-' + id);
        const published = editionFor(id);
        return <details className="mediaDetails marketCollection" key={id} id={'album-' + id} open={hash === '#album-' + id || undefined}>
          <summary><AlbumLogo id={id} size={48}/>
            <span><strong>{title}</strong><small>{typeof quote?.supply === 'number' ? `Сминчено ${format.format(quote.supply)}` : 'Выпуск NFT'}{quote?.floor ? <> · <Price value={quote.floor} currency="gram" from/></> : null}</small></span>
          </summary>
          <p>{typeof quote?.supply === 'number' ? `Сминчено на Getgems: ${format.format(quote.supply)} из ${format.format(published.edition)}.` : `Лимит коллекции: ${format.format(published.edition)} наборов в TON.`}</p>
          <a className="textLink" href={`https://getgems.io/collection/${stickerData.collectionByAlbum[id]}`} target="_blank" rel="noreferrer">Открыть на Getgems</a>
        </details>;
      })}
    </section> : <>
      {album === null ? <>
        <section className="card stickerShelf">
          <ProgressCount count={count} total={total}/>
          <ProgressStatus/>
          <p className="stickerMintTotal"><GameGlyph name="treasure"/> Сминчено наборов <strong>{totalMinted === undefined ? '—' : format.format(totalMinted)}</strong></p>
          <details className="mediaDetails stickerHelp">
            <summary><GameGlyph name="info"/><strong>Как собираются наборы</strong></summary>
            <p>Стикерпак даёт 1–3 стикера. Повторки возможны. Часть карточек выдаётся за секреты и достижения.</p>
            <p>Собери все пять карточек альбома, чтобы создать набор. Созданный набор можно выпустить в TON.</p>
          </details>
          <div className="albumGrid">{albums.map((label, index) => {
            const pack = index + 1;
            const minted = supplyFor(pack);
            const found = stickers.filter(item => stickerAlbum(item.id) === pack && isDone(item.id)).length;
            return <DetailLink key={label} to={`/collections/albums/${pack}`}>
              <AlbumLogo id={pack}/>
              <span className="sr-only">{label}, собрано {found} из 5{typeof minted === 'number' ? `, сминчено ${minted}` : ''}</span>
              <span className="albumTileMeta" aria-hidden="true">
                <span className={found === 5 ? 'isComplete' : undefined}>{found}/5</span>
                {typeof minted === 'number' && <span className="nftBadge">{format.format(minted)} NFT</span>}
              </span>
            </DetailLink>;
          })}</div>
        </section>
      </> : <section className="card stickerShelf stickerCollection">
        <div className="mediaHeading"><AlbumLogo id={album} size={67}/><div>
          <h2>{title}</h2>{theme && <p>{theme}</p>}
        </div></div>
        <ProgressCount count={count} total={total}/>
        <ProgressStatus/>
        <AlbumPublishing edition={editionFor(album)} minted={supplyFor(album)} floor={quotesById.get('album-' + album)?.floor}/>
        {matches.map(item => <div className="stickerProgressRow" key={item.id}>
          <details className="mediaDetails"><summary>
            <GameArt path={`/game/stickers/${item.id}.webp`} size={34}/>
            <span><strong>{item.name}</strong><small>{item.kind === 'secret' ? 'Секрет' :
              item.kind === 'achievement' ? 'Достижение' : 'Набор стикеров'}</small></span>
          </summary>
          {item.kind === 'secret' ? <DetailLink className="textLink" to={`/secrets#sticker-${item.id}`}>Условие секрета</DetailLink> :
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

function AlbumPublishing({ edition, minted, floor }: {
  edition: typeof publishing.albums[number]; minted?: number | null; floor?: number | null;
}) {
  return <div className="albumPublishing">
    <dl>
      <div><dt>Сминчено на Getgems</dt><dd>{typeof minted === 'number' ? `${format.format(minted)} из ${format.format(edition.edition)}` : '—'}</dd></div>
      <div><dt>Стоимость минта</dt><dd><Price value={edition.mintGram} currency="gram"/></dd></div>
      <div><dt>Флор на Getgems</dt><dd>{floor && floor > 0 ? <Price value={floor} currency="gram" from/> : '—'}</dd></div>
    </dl>
    <a className="textLink" href={`https://getgems.io/collection/${stickerData.collectionByAlbum[edition.id]}`} target="_blank" rel="noreferrer">
      Открыть коллекцию на Getgems <span className="externalMark" aria-hidden="true"/>
    </a>
  </div>;
}
