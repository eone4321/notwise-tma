import { artSrc } from '../ui/warmArt';
import { collectionMarket } from './marketData';
import { Link } from 'react-router';
import collections from './market-collections.json';

const featured = [
  { id: 'eggs', name: 'Яйца', description: 'Исторический выпуск NOT Wise' },
  { id: 'genesis', name: 'Совы Genesis', description: 'Первая коллекция NOT Wise' },
  { id: 'skins', name: 'Скины', description: 'Облик и бонус к фарму' },
  { id: 'items', name: 'NFT-предметы', description: 'Рынок Getgems' },
];
const gram = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const usdt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

export function OwlPrices({ only }: { only?: 'eggs' | 'genesis' | 'items' } = {}) {
  const { data: market, pending } = collectionMarket.useSnapshot();

  return <section className="card" aria-labelledby="owl-market">
    <div className="marketHeading"><h2 id="owl-market">{only === 'eggs' ? 'Цена NFT-яйца' : only === 'items' ? 'Цена NFT-предметов' : 'Цены на NFT в Not Wise'}</h2>
    {!only && <Link className="marketAll" to="/collections/market" state={{ returnTo: '/' }}>См. все<span className="sr-only"> коллекции</span></Link>}</div>
    <p className="caption">От минимальной цены на Getgems. USDT — эквивалент.</p>
    <div className="owlMarketList" aria-busy={!market && pending}>
      {featured.filter(item => only ? item.id === only : item.id !== 'eggs').map(item => {
        const collection = collections.find(({ id }) => id === item.id);
        if (!collection) return null;
        const quote = market?.items.find(({ id }) => id === item.id);
        const floor = quote?.floor ?? 0;
        const hasPrice = Number.isFinite(floor) && floor > 0;
        const rate = market?.gramToUsdt;
        return <a className="marketPriceRow" key={item.id}
          href={`https://getgems.io/collection/${collection.address}`} target="_blank" rel="noreferrer">
          <img className="marketRowArt" src={artSrc(item.id === 'items' ? '/game/items/ring-wit-3.webp' : `/brand/collections/${item.id}.png`)} alt="" width="96" height="96"/>
          <span><b>{item.name}</b><small>{item.description}</small></span>
          <span className="marketPriceValues" title={quote?.available === false && hasPrice ? 'Последняя доступная цена' : undefined}>
            {hasPrice ? <>
              <strong><img src={artSrc('/brand/tokens/gram.png')} alt="" width="15" height="15"/>от {gram.format(floor)} GRAM</strong>
            </> : <small>{pending && !market ? 'Загрузка…' : 'Цена недоступна'}</small>}
            <small>{hasPrice && rate && Number.isFinite(rate) && rate > 0 ? <>
              <img src={artSrc('/brand/tokens/usdt.webp')} alt="" width="14" height="14"/>≈ {usdt.format(floor * rate)} USDT
            </> : <span aria-hidden="true">&nbsp;</span>}</small>
          </span>
        </a>;
      })}
    </div>

  </section>;
}
