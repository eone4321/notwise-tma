import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import collections from './market-collections.json';

const featured = [
  { id: 'eggs', name: 'Яйца', description: 'Случайные награды' },
  { id: 'genesis', name: 'Совы Genesis', description: 'Первая коллекция NOT Wise' },
  { id: 'skins', name: 'Скины', description: 'Облик и бонус к фарму' },
  { id: 'items', name: 'NFT-предметы', description: 'Рынок Getgems' },
];
const gram = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const usdt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

type Quote = {
  id: string;
  floor: number | null;
  currency: 'GRAM';
  status: 'fresh' | 'stale' | 'unavailable';
};
type MarketPrices = { items: Quote[]; gramToUsdt: number | null };

export function OwlPrices({ only }: { only?: 'eggs' | 'genesis' | 'items' } = {}) {
  const [market, setMarket] = useState<MarketPrices | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch('/api/market/owl-prices', { signal: controller.signal });
        if (!response.ok) throw new Error('Market unavailable');
        const data = await response.json();
        if (!Array.isArray(data.items)) throw new Error('Invalid market response');
        setMarket(data);
      } catch {
        if (!controller.signal.aborted) setMarket(previous => previous
          ? { ...previous, gramToUsdt: null, items: previous.items.map(quote => ({
            ...quote, status: quote.status === 'fresh' ? 'stale' : quote.status,
          })) }
          : { items: [], gramToUsdt: null });
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 600_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return <section className="card" aria-labelledby="owl-market">
    <h2 id="owl-market">{only === 'eggs' ? 'Цена NFT-яйца' : only === 'items' ? 'Цена NFT-предметов' : 'Цены на NFT в Not Wise'}</h2>
    <p className="caption">От минимальной цены на Getgems. USDT — эквивалент.</p>
    <div className="owlMarketList" aria-busy={market === null}>
      {featured.filter(item => only ? item.id === only : item.id !== 'items').map(item => {
        const collection = collections.find(({ id }) => id === item.id);
        if (!collection) return null;
        const quote = market?.items.find(({ id }) => id === item.id);
        const floor = quote?.floor ?? 0;
        const hasPrice = quote?.currency === 'GRAM' && Number.isFinite(floor) && floor > 0;
        const rate = market?.gramToUsdt;
        return <a className="marketPriceRow" key={item.id}
          href={`https://getgems.io/collection/${collection.address}`} target="_blank" rel="noreferrer">
          <img className="marketRowArt" src={item.id === 'items' ? '/game/items/ring-wit-3.webp' : `/brand/collections/${item.id}.png`} alt="" width="96" height="96"/>
          <span><b>{item.name}</b><small>{item.description}</small></span>
          <span className="marketPriceValues">
            {hasPrice ? <>
              <strong><img src="/brand/tokens/gram.png" alt="" width="15" height="15"/>от {gram.format(floor)} GRAM</strong>
              {rate && Number.isFinite(rate) && rate > 0 ? <small>
                <img src="/brand/tokens/usdt.webp" alt="" width="14" height="14"/>≈ {usdt.format(floor * rate)} USDT
              </small> : null}
              {quote.status === 'stale' && <small>Сохранённая цена</small>}
            </> : <small>{market === null ? 'Загрузка…' : 'Цена недоступна'}</small>}
          </span>
        </a>;
      })}
    </div>
    {!only && <Link className="textLink" to="/collections/market">Все коллекции</Link>}
  </section>;
}
