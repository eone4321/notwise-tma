import { Price } from './Price';
import { DetailLink } from '../ui/DetailLink';
import { artSrc } from '../ui/warmArt';
import { collectionMarket } from './marketData';
import collections from './market-collections.json';

const featured = [
  { id: 'eggs', description: 'Коллекционные яйца' },
  { id: 'genesis', description: 'Первая коллекция сов' },
  { id: 'skins', description: 'Скины сов' },
  { id: 'items', description: 'Игровые предметы' },
];

export function OwlPrices({ only }: { only?: 'eggs' | 'genesis' | 'items' } = {}) {
  const { data: market, pending } = collectionMarket.useSnapshot();

  return <section className="card owlMarket" aria-labelledby="owl-market">
    <div className="marketHeading"><h2 id="owl-market">{only === 'eggs' ? 'Цена NFT-яйца' : only === 'items' ? 'Цена NFT-предметов' : 'Цены на NFT в Not Wise'}</h2>
    {!only && <DetailLink className="marketAll" to="/collections/market">См. все<span className="sr-only"> коллекции</span></DetailLink>}</div>

    <div className="owlMarketList" aria-busy={!market && pending}>
      {featured.filter(item => only ? item.id === only : item.id !== 'eggs').map(item => {
        const collection = collections.find(({ id }) => id === item.id);
        if (!collection) return null;
        const quote = market?.items.find(({ id }) => id === item.id);
        const floor = quote?.floor ?? 0;
        const hasPrice = Number.isFinite(floor) && floor > 0;
        return <a className="marketPriceRow" key={item.id}
          href={`https://getgems.io/collection/${collection.address}`} target="_blank" rel="noreferrer">
          <img className="marketRowArt" src={artSrc(`/brand/collections/${item.id}.png`)} alt="" width="40" height="40"/>
          <span className="marketCollectionLabel"><b>{collection.name}</b><small>{item.description}</small></span>
          <span className="marketPriceValues" title={quote?.available === false && hasPrice ? 'Последняя доступная цена' : undefined}>
            {hasPrice ? <Price value={floor} currency="gram" from/> : <small>{pending && !market ? 'Загрузка…' : '—'}</small>}
          </span>
        </a>;
      })}
    </div>

  </section>;
}
