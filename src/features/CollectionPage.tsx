import { useEffect, useState } from 'react';
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

type MarketRow = { id: string; floor: number | null; supply: number | null };
const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const stickerAlbum = (id: number) => Math.ceil(id / 5);
let cachedMarket: MarketRow[] | null = null;

export function CollectionPage() {
  const { pathname, hash, state } = useLocation();
  const { collected, setMark } = useProgress();
  const albumNumber = Number(pathname.match(/albums\/(\d+)$/)?.[1]);
  const album = albumNumber >= 1 && albumNumber <= albums.length ? albumNumber : null;
  const marketView = pathname === '/collections/market';
  const [market, setMarket] = useState(cachedMarket);

  useEffect(() => {
    if (!marketView) return;
    const controller = new AbortController();
    fetch('/api/market/collections', { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        if (controller.signal.aborted) return;
        cachedMarket = Array.isArray(result?.items) ? result.items : [];
        setMarket(cachedMarket);
      }).catch(() => { if (!controller.signal.aborted) setMarket([]); });
    return () => controller.abort();
  }, [marketView]);

  const matches = album === null ? [] : stickers.filter(item => stickerAlbum(item.id) === album);
  const count = album === null ? collected.length : matches.filter(item => collected.includes(item.id)).length;
  const title = album === null ? '' : albums[album - 1];
  const theme = themes[title] ?? marketPacks.packs.find(pack => pack.name === 'NOT Wise: ' + title)?.theme;
  const total = album === null ? stickers.length : matches.length;
  return <>
    {album === null && <nav className="choiceBar" aria-label="Раздел коллекций">
      <Link to="/collections" aria-current={!marketView ? 'page' : undefined}>Стикеры</Link>
      <Link to="/collections/market" aria-current={marketView ? 'page' : undefined}>NFT на Getgems</Link>
    </nav>}
    {marketView ? <section className="card marketCollections" aria-busy={market === null}>
      {marketCollections.map(item => {
        const quote = market?.find(row => row.id === item.id);
        const floor = quote?.floor;
        return <details className="mediaDetails marketCollection" key={item.id} id={item.id} open={hash === "#" + item.id || undefined}>
          <summary>
            <GameArt path={'/brand/collections/' + item.id + '.png'} size={42}/>
            <span><strong>{item.name}</strong>
              <small>{market === null ? 'Загружаем флор…' : floor && floor > 0
                ? <span className="floorPrice">от {format.format(floor)} <GameArt path="/brand/tokens/gram.png" size={15}/> GRAM</span>
                : 'Флор недоступен'}</small></span>
          </summary>
          <p>{purpose[item.id]}</p>
          {typeof quote?.supply === 'number' && <small>Выпущено {format.format(quote.supply)} NFT в коллекции</small>}
          <div><a className="textLink" href={`https://getgems.io/collection/${item.address}`} target="_blank" rel="noreferrer">Открыть на Getgems</a></div>
        </details>;
      })}
    </section> : <>
      {album === null ? <>
        <ProgressCount count={count} total={total}/>
        <ProgressStatus/>
        <div className="albumGrid">{albums.map((label, index) => {
          const pack = index + 1;
          const found = collected.filter(id => stickerAlbum(id) === pack).length;
          return <Link key={label} to={`/collections/albums/${pack}`}>
            <GameArt path={`/game/albums/${pack}.webp`} size={45}/><strong>{label}</strong>
            <small>{found}/5 · осталось {5 - found}</small>
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
          <label className="secretCheck"><input type="checkbox" checked={collected.includes(item.id)}
            onChange={event => setMark('collected', item.id, event.target.checked)}/>
            <span className="sr-only">Собран: {item.name}</span></label>
        </div>)}
        <details className="mediaDetails guideDisclosure">
          <summary><GameArt path="/game/items/coins.webp" size={34}/><span><strong>Выпуск NFT</strong><small>После сбора 5 стикеров</small></span></summary>
          <p>Полный набор позволяет начать выпуск в игре. Лимит и число выпущенных NFT для этого набора пока не подтверждены.</p>
          <Link to="/collections/market" className="textLink">Коллекции на Getgems</Link>
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
