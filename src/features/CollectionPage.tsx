import { DetailLink } from '../ui/DetailLink';
import publishing from '../domain/game-publishing.json';
import { Price } from './Price';
import { collectionMarket } from './marketData';
import { MarketChartsPage } from './MarketChartsPage';
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
import { useGuideLocale } from './guideLocale';

const albums = ['Wonderland','Flying Saucer','Cosmo Zone','Summer Vibes','Wild Fortune','Hellborn','Mimizuku','Showtime','Power Mode','Naughty Mood','Hustle Pack','Spellbound','Wanted Sheriff','Internet Moments','Laa-Laa Land','Fine Art','The Family','GG Pack','Golden Scarab','Back to School'];
const themes: Record<string, string> = { Showtime: 'Сцена и иллюзии' };
const themesEn: Record<string, string> = {
  Wonderland: 'Fairytale world',
  'Flying Saucer': 'UFOs & space',
  'Cosmo Zone': 'Galactic owls',
  'Summer Vibes': 'Summer chill & palms',
  'Wild Fortune': 'High stakes & casino',
  Hellborn: 'Infernal demonic owls',
  Mimizuku: 'Japanese folklore & sakura',
  Showtime: 'Stage & illusions',
  'Power Mode': 'Sports, fitness & strength',
  'Naughty Mood': 'Bold & playful vibes',
  'Hustle Pack': 'Crypto hustle & business',
  Spellbound: 'Witchcraft & potions',
  'Wanted Sheriff': 'Wild West & sheriffs',
  'Internet Moments': 'Iconic web memes',
  'Laa-Laa Land': 'Cartoon fantasies',
  'Fine Art': 'Classic museum masterpieces',
  'The Family': 'Mafia & owl clans',
  'GG Pack': 'Esports & Good Game',
  'Golden Scarab': 'Ancient Egypt & pharaohs',
  'Back to School': 'School & knowledge',
};

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

const purposeEn: Record<string, string> = {
  genesis: 'The original NOT Wise owl NFT collection that started the project.',
  eggs: 'Standalone NFT egg collection on TON. Previously burned to claim an in-game egg. Exchange availability is currently unconfirmed.',
  owlings: 'First-anniversary NOT Wise NFT collection.',
  classics: 'Collectible Telegram sticker pack from Sticker Pad.',
  domains: 'Third-level TON domain names linked to notwise.ton.',
  merch: 'NFTs minted to redeem physical NOT Wise merchandise.',
  items: 'Rings, artifacts, and consumables minted as NFTs from the in-game inventory.',
  skins: 'NFT owl skins. Equipped skin parts boost coin farming.',
  family: 'Standalone Not Wise Family collection on TON.',
};

const achievementActionsEn: Record<number, string> = {
  5: 'Play 10 days in a row.',
  6: 'Complete 30 flights.',
  13: 'Use combat skills 100 times.',
  19: 'Open 10 eggs.',
  22: 'Accumulate 100,000 coins on your balance.',
  27: 'Feed your owl its favorite food 10 times.',
  33: 'Pet your owl 100 times.',
  40: 'Collect 2,000 coins in a single flight.',
  44: 'Land 1,000 hits in the Dojo.',
  49: 'Win 50 fights.',
  51: 'Complete 20 squad ritual tasks.',
  60: 'Get the maximum rating in Wild Magic 3 times.',
  63: 'Win 10 raids.',
  69: 'Reach level 10.',
  75: 'Invite 3 friends who hatch their owls.',
  76: 'Collect 15 different stickers.',
  84: 'Attack for your squad in 7 consecutive siege rounds.',
  87: 'Win 5 fights in a row.',
  94: 'Open 30 capsules.',
  99: 'Enchant a ring to +5.',
};

const formatRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const formatEn = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const stickerAlbum = (id: number) => Math.ceil(id / 5);

export function CollectionPage() {
  const { pathname, hash, state } = useLocation();
  const keepParent = state?.guideDetail === true;
  const { locale } = useGuideLocale();
  const isRu = locale !== 'en';
  const format = isRu ? formatRu : formatEn;
  const stickerTitle = (item: (typeof stickers)[number]) => (isRu ? (item.name_ru || item.name) : item.name);
  const { collected, completed, setMark } = useProgress();
  const isDone = (id: number) => collected.includes(id) || completed.includes(id);
  const albumNumber = Number(pathname.match(/albums\/(\d+)$/)?.[1]);
  const album = albumNumber >= 1 && albumNumber <= albums.length ? albumNumber : null;
  const marketView = pathname === '/collections/market';
  const chartsView = pathname === '/collections/charts';
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
  const theme = isRu
    ? (themes[title] ?? marketPacks.packs.find(pack => pack.name === 'NOT Wise: ' + title)?.theme)
    : themesEn[title];
  const total = album === null ? stickers.length : matches.length;
  return <>
    {album === null && !chartsView && <nav className="choiceBar profileTabs" aria-label={isRu ? 'Раздел коллекций' : 'Collections section'}>
      <Link to="/collections" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={!marketView ? 'page' : undefined}><GameGlyph name="gift"/>{isRu ? 'Стикеры' : 'Stickers'}</Link>
      <Link to="/collections/market" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={marketView ? 'page' : undefined}><GameGlyph name="treasure"/>{isRu ? 'NFT на Getgems' : 'Getgems NFTs'}</Link>
    </nav>}
    {chartsView ? <MarketChartsPage/> : marketView ? <section className="card marketCollections" aria-busy={!market && pending}>
      {marketCollections.map(item => {
        const quote = quotesById.get(item.id);
        const floor = quote?.floor;
        return <details className="mediaDetails marketCollection" key={item.id} id={item.id} open={hash === "#" + item.id || undefined}>
          <summary>
            <GameArt path={'/brand/collections/' + item.id + '.png'} size={42}/>
            <span><strong>{!isRu && item.id === 'classics' ? 'NOT Wise :: Classics (Sticker packs)' : item.name}</strong>
              <small>{!market && pending ? (isRu ? 'Загружаем флор…' : 'Loading floor…') : floor && floor > 0
                ? <span className="floorPrice" title={quote?.available === false ? (isRu ? 'Последняя доступная цена' : 'Last available price') : undefined}><Price value={floor} currency="gram" from/></span>
                : (isRu ? 'Флор недоступен' : 'Floor unavailable')}</small></span>
          </summary>
          <p>{isRu ? purpose[item.id] : purposeEn[item.id]}</p>
          {typeof quote?.supply === 'number' && <small>{isRu ? `Выпущено ${format.format(quote.supply)} NFT в коллекции` : `${format.format(quote.supply)} NFTs minted in collection`}</small>}
          <div className="marketCollectionLinks">
            <a className="textLink" href={`https://getgems.io/collection/${item.address}`} target="_blank" rel="noreferrer">{isRu ? 'Открыть на Getgems' : 'Open on Getgems'}</a>
            <DetailLink className="textLink" to={`/collections/charts?slug=${encodeURIComponent(item.id === 'skins' ? 'owl-skin' : 'col:' + item.id)}`}>{isRu ? 'График флора' : 'Floor chart'}</DetailLink>
          </div>
          {item.id === 'genesis' && <a className="textLink" href="https://t.me/NotWiseGuideBot?start=owl_sales">{isRu ? 'Уведомления о продажах' : 'Sale notifications'}</a>}
        </details>;
      })}
      <h2 className="albumMarketHeading">{isRu ? 'NFT-наборы стикеров' : 'NFT sticker packs'}</h2>
      {albums.map((title, index) => {
        const id = index + 1;
        const quote = quotesById.get('album-' + id);
        const published = editionFor(id);
        return <details className="mediaDetails marketCollection" key={id} id={'album-' + id} open={hash === '#album-' + id || undefined}>
          <summary><AlbumLogo id={id} size={48}/>
            <span><strong>{title}</strong><small>{typeof quote?.supply === 'number' ? (isRu ? `Сминчено ${format.format(quote.supply)}` : `Minted ${format.format(quote.supply)}`) : (isRu ? 'Выпуск NFT' : 'NFT edition')}{quote?.floor ? <> · <Price value={quote.floor} currency="gram" from/></> : null}</small></span>
          </summary>
          <p>{typeof quote?.supply === 'number' ? (isRu ? `Сминчено на Getgems: ${format.format(quote.supply)} из ${format.format(published.edition)}.` : `Minted on Getgems: ${format.format(quote.supply)} of ${format.format(published.edition)}.`) : (isRu ? `Лимит коллекции: ${format.format(published.edition)} наборов в TON.` : `Collection edition limit: ${format.format(published.edition)} packs on TON.`)}</p>
          <a className="textLink" href={`https://getgems.io/collection/${stickerData.collectionByAlbum[id]}`} target="_blank" rel="noreferrer">{isRu ? 'Открыть на Getgems' : 'Open on Getgems'}</a>
        </details>;
      })}
    </section> : <>
      {album === null ? <>
        <section className="card stickerShelf">
          <ProgressCount count={count} total={total} isRu={isRu}/>
          <ProgressStatus/>
          <p className="stickerMintTotal"><GameGlyph name="treasure"/> {isRu ? 'Сминчено наборов' : 'Minted packs'} <strong>{totalMinted === undefined ? '—' : format.format(totalMinted)}</strong></p>
          <details className="mediaDetails stickerHelp">
            <summary><GameGlyph name="info"/><strong>{isRu ? 'Как собираются наборы' : 'How sticker packs work'}</strong></summary>
            <p>{isRu ? 'Стикерпак даёт 1–3 стикера. Повторки возможны. Часть карточек выдаётся за секреты и достижения.' : 'A sticker pack drops 1–3 stickers. Duplicates can occur. Some cards are earned from secrets and achievements.'}</p>
            <p>{isRu ? 'Собери все пять карточек альбома, чтобы создать набор. Созданный набор можно выпустить в TON.' : 'Collect all five cards in an album to craft the pack. A crafted pack can be minted as an NFT on TON.'}</p>
          </details>
          <div className="albumGrid">{albums.map((label, index) => {
            const pack = index + 1;
            const minted = supplyFor(pack);
            const found = stickers.filter(item => stickerAlbum(item.id) === pack && isDone(item.id)).length;
            return <DetailLink key={label} to={`/collections/albums/${pack}`}>
              {typeof minted === 'number' && <span className="albumNftCorner" aria-hidden="true">{format.format(minted)} NFT</span>}
              <AlbumLogo id={pack}/>
              <span className="sr-only">{isRu ? `${label}, собрано ${found} из 5${typeof minted === 'number' ? `, сминчено ${minted}` : ''}` : `${label}, collected ${found} of 5${typeof minted === 'number' ? `, minted ${minted}` : ''}`}</span>
              <span className="albumTileMeta" aria-hidden="true">
                <span className={found === 5 ? 'isComplete' : undefined}>{found}/5</span>
              </span>
            </DetailLink>;
          })}</div>
        </section>
      </> : <section className="card stickerShelf stickerCollection">
        <div className="mediaHeading"><AlbumLogo id={album} size={67}/><div>
          <h2>{title}</h2>{theme && <p>{theme}</p>}
        </div></div>
        <ProgressCount count={count} total={total} isRu={isRu}/>
        <ProgressStatus/>
        <AlbumPublishing edition={editionFor(album)} minted={supplyFor(album)} floor={quotesById.get('album-' + album)?.floor} isRu={isRu}/>
        {matches.map(item => <div className="stickerProgressRow" key={item.id}>
          <details className="mediaDetails"><summary>
            <GameArt path={`/game/stickers/${item.id}.webp`} size={34}/>
            <span><strong>{stickerTitle(item)}</strong><small>{item.kind === 'secret' ? (isRu ? 'Секрет' : 'Secret') :
              item.kind === 'achievement' ? (isRu ? 'Достижение' : 'Achievement') : (isRu ? 'Набор стикеров' : 'Sticker pack')}</small></span>
          </summary>
          {item.kind === 'secret' ? <DetailLink className="textLink" to={`/secrets#sticker-${item.id}`}>{isRu ? 'Условие секрета' : 'Secret condition'}</DetailLink> :
            <p>{(isRu ? achievementActions[item.id] : achievementActionsEn[item.id]) ?? (
              stickerData.oddsById[item.id] > 0
                ? (isRu
                  ? `Шанс получить из одного пака · ${chanceLabel(chancePerOpening(stickerData.oddsById[item.id], stickerData.drawCounts))}`
                  : `Drop chance per pack · ${chanceLabel(chancePerOpening(stickerData.oddsById[item.id], stickerData.drawCounts), true)}`)
                : (isRu ? 'Способ получения указан в игре.' : 'How to obtain is shown in-game.')
            )}</p>}
          </details>
          <label className="secretCheck"><input type="checkbox" checked={isDone(item.id)}
            onChange={event => setMark('collected', item.id, event.target.checked)}/>
            <span className="sr-only">{isRu ? `Собран: ${stickerTitle(item)}` : `Collected: ${stickerTitle(item)}`}</span></label>
        </div>)}
      </section>}
    </>}
  </>;
}

function ProgressCount({ count, total, isRu }: { count: number; total: number; isRu: boolean }) {
  return <div className="stickerProgress">
    <div className="progressCounts"><strong>{isRu ? `Собрано ${count}/${total}` : `Collected ${count}/${total}`}</strong><span>{isRu ? `Осталось ${total - count}` : `${total - count} left`}</span></div>
    <progress className="gameProgress" value={count} max={total} aria-label={isRu ? 'Собрано стикеров' : 'Collected stickers'}/>
  </div>;
}

function AlbumPublishing({ edition, minted, floor, isRu }: {
  edition: typeof publishing.albums[number]; minted?: number | null; floor?: number | null; isRu: boolean;
}) {
  const format = isRu ? formatRu : formatEn;
  return <div className="albumPublishing">
    <dl>
      <div><dt>{isRu ? 'Создание пака' : 'Craft pack'}</dt><dd><Price value={edition.creationGram} currency="gram"/></dd></div>
      <div><dt>{isRu ? 'Минт в NFT' : 'Mint NFT'}</dt><dd><Price value={edition.mintGram} currency="gram"/></dd></div>
      <div><dt>{isRu ? 'Сминчено на Getgems' : 'Minted on Getgems'}</dt><dd>{typeof minted === 'number' ? (isRu ? `${format.format(minted)} из ${format.format(edition.edition)}` : `${format.format(minted)} of ${format.format(edition.edition)}`) : '—'}</dd></div>
      <div><dt>{isRu ? 'Флор на Getgems' : 'Floor on Getgems'}</dt><dd>{floor && floor > 0 ? <Price value={floor} currency="gram" from/> : '—'}</dd></div>
    </dl>
    <p className="albumMintNote">{isRu ? 'Создание даёт стикерпак в Telegram. При минте в NFT он удаляется из Telegram, но предмет можно вернуть в игру.' : 'Crafting unlocks the Telegram sticker pack. Minting as an NFT removes it from Telegram, and the NFT can be returned to the game.'}</p>
    <a className="textLink" href={`https://getgems.io/collection/${stickerData.collectionByAlbum[edition.id]}`} target="_blank" rel="noreferrer">
      {isRu ? 'Открыть коллекцию на Getgems' : 'Open collection on Getgems'} <span className="externalMark" aria-hidden="true"/>
    </a>
  </div>;
}
