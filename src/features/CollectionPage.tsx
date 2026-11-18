import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import stickers from '../../public/data/all_100_stickers.json';
import marketPacks from '../../public/data/stickers.json';
import { GameArt } from '../ui/GameArt';
import { achievementActions } from './inventory';
import marketCollections from './market-collections.json';

const albums = ['Wonderland','Flying Saucer','Cosmo Zone','Summer Vibes','Wild Fortune','Hellborn','Mimizuku','Showtime','Power Mode','Naughty Mood','Hustle Pack','Spellbound','Wanted Sheriff','Internet Moments','Laa-Laa Land','Fine Art','The Family','GG Pack','Golden Scarab','Back to School'];

export function CollectionPage() {
  const [tab,setTab] = useState('albums');
  const { pathname } = useLocation();
  const albumId = Number(pathname.match(/albums\/(\d+)$/)?.[1]);
  const album = albumId >= 1 && albumId <= albums.length ? albumId : null;
  const [query,setQuery] = useState('');
  const [market,setMarket] = useState<Record<string, number>>({});
  useEffect(() => {
    if (tab !== 'market') return;
    const controller = new AbortController();
    fetch('/api/market/collections',{signal:controller.signal}).then(response => response.ok ? response.json() : null)
      .then(data => {
        if (Array.isArray(data?.items)) {
          setMarket(Object.fromEntries(data.items.filter((item: { supply?: number }) => typeof item.supply === 'number')
            .map((item: { id: string; supply: number }) => [item.id,item.supply])));
        }
      }).catch(() => {});
    return () => controller.abort();
  },[tab]);
  const term = query.trim().toLowerCase().replace(/^#0*/, '');
  const matches = stickers.filter(item => (album === null || Math.ceil(item.id/5) === album) &&
    (!term || (String(item.id) === term || item.name.toLowerCase().includes(term))));
  return <>
    <p className="intro">У каждого игрового альбома пять стикеров. Их получают из наборов, за достижения и за раскрытие секретов.</p>
    <div className="choiceBar" aria-label="Раздел коллекций">
      <button aria-pressed={tab === 'albums'} onClick={() => setTab('albums')}>Игровые альбомы</button>
      <button aria-pressed={tab === 'market'} onClick={() => setTab('market')}>Рынок Getgems</button>
    </div>
    {tab === 'albums' ? <>
      <label className="field">{album === null ? 'Поиск стикера' : 'Поиск в альбоме'}<input type="search" placeholder="Например, 42 или Sushi Master" value={query} onChange={event => setQuery(event.target.value)}/></label>
      {!query.trim() && album === null ? <div className="albumGrid">{albums.map((label,i) =>
        <Link key={label} to={`/collections/albums/${i+1}`}><GameArt path={`/game/albums/${i+1}.webp`} size={72}/><span>{label}</span><small>№{i*5+1}–{i*5+5}</small></Link>
      )}</div> : <section className="card">
        {album !== null && <><Link className="textLink" to="/collections">← Все альбомы</Link><h2>{albums[album-1]}</h2></>}
        {matches.length === 0 && <p>Стикеров с таким названием или номером нет.</p>}
        {matches.map(item => <details className="mediaDetails" key={item.id}><summary>
          <GameArt path={`/game/stickers/${item.id}.webp`}/>
          <span><strong>{item.name}</strong><small>№{item.id} · {item.kind === 'secret' ? 'Секрет' : item.kind === 'achievement' ? 'Достижение' : 'Из набора стикеров'}</small></span>
        </summary>
          {item.kind === 'secret' ? <Link className="textLink" to={`/secrets#sticker-${item.id}`}>Узнать условие секрета →</Link> :
            <p>{achievementActions[item.id] ?? 'Может выпасть при открытии набора стикеров.'}</p>}
          <p className="caption">Редкость {item.rarity} из 3 · альбом {albums[Math.ceil(item.id/5)-1]}</p>
        </details>)}
      </section>}
    </> : <>
      <section className="card"><h2>NFT коллекции</h2><p>Актуальные предложения и валюту продажи смотри в Getgems.</p>
        {marketCollections.map(item => <div className="mediaRow marketRow" key={item.id}><div><h3>{item.name}</h3>{market[item.id] !== undefined && <small>{market[item.id].toLocaleString('ru-RU')} предметов</small>}</div><a className="textLink" href={`https://getgems.io/collection/${item.address}`} target="_blank" rel="noreferrer">Getgems ↗</a></div>)}
      </section>
      <section className="card"><h2>Тематические наборы</h2>{marketPacks.packs.map(pack => <div className="mediaRow" key={pack.id}><div><h3>{pack.name}</h3><p>{pack.theme}</p></div></div>)}</section>
    </>}
  </>;
}
