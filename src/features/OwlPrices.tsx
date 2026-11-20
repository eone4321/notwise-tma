import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { Price } from './Price';
import { DetailLink } from '../ui/DetailLink';
import { artSrc } from '../ui/warmArt';
import { collectionMarket, explorerMarket, itemMarket } from './marketData';
import collections from './market-collections';
import { lightHaptic } from '../telegram/client';
import { useGuideLocale } from './guideLocale';

const singleFeatured = [
  { id: 'eggs', ru: 'Коллекционные яйца', en: 'Collectible eggs' },
  { id: 'genesis', ru: 'Первая коллекция сов', en: 'First owl collection' },
  { id: 'skins', ru: 'Скины сов', en: 'Owl skins' },
  { id: 'items', ru: 'Игровые предметы', en: 'In-game items' },
];

const marqueeCollections = [
  { id: 'genesis', ru: 'NOT Wise', en: 'NOT Wise', slug: 'col:genesis' },
  { id: 'skins', ru: 'Скины', en: 'Skins', slug: 'owl-skin' },
  { id: 'items', ru: 'Предметы', en: 'Items', slug: 'col:items' },
  { id: 'owlings', ru: 'Owlings', en: 'Owlings', slug: 'col:owlings' },
  { id: 'eggs', ru: 'NFT-яйца', en: 'NFT Eggs', slug: 'col:eggs' },
  { id: 'classics', ru: 'Стикеры', en: 'Stickers', slug: 'col:classics' },
  { id: 'domains', ru: 'Домены', en: 'Domains', slug: 'col:domains' },
  { id: 'family', ru: 'Family', en: 'Family', slug: 'col:family' },
] as const;

function lowestFloor(rows: readonly { floor: number }[] = []) {
  return rows.reduce<number | null>((lowest, { floor }) =>
    Number.isFinite(floor) && floor > 0 && (lowest === null || floor < lowest) ? floor : lowest, null);
}

export function OwlPrices({ only }: { only?: 'eggs' | 'genesis' | 'items' } = {}) {
  const { data: market, pending } = collectionMarket.useSnapshot();
  const { data: explorer } = explorerMarket.useSnapshot();
  const { data: items } = itemMarket.useSnapshot();
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const fmtFloor = new Intl.NumberFormat(en ? 'en-US' : 'ru-RU', { maximumFractionDigits: 1 });

  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      dragFree: true,
      align: 'start',
      containScroll: false,
    },
    [
      AutoScroll({
        speed: 0.18,
        startDelay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
  );

  if (only) {
    const heading = only === 'eggs'
      ? (en ? 'NFT Egg Price' : 'Цена NFT-яйца')
      : only === 'items'
        ? (en ? 'NFT Item Prices' : 'Цена NFT-предметов')
        : (en ? 'NFT Prices in Not Wise' : 'Цены на NFT в Not Wise');
    return (
      <section className="card owlMarket" aria-labelledby="owl-market">
        <div className="marketHeading">
          <h2 id="owl-market">{heading}</h2>
        </div>
        <div className="owlMarketList" aria-busy={!market && pending}>
          {singleFeatured.filter(item => item.id === only).map(item => {
            const collection = collections.find(({ id }) => id === item.id);
            if (!collection) return null;
            const quote = market?.items.find(({ id }) => id === item.id);
            const floor = quote?.floor ?? 0;
            const hasPrice = Number.isFinite(floor) && floor > 0;
            return (
              <a
                className="marketPriceRow"
                key={item.id}
                href={`https://getgems.io/collection/${collection.address}`}
                target="_blank"
                rel="noreferrer"
              >
                <img className="marketRowArt" src={artSrc(`/brand/collections/${item.id}.png`)} alt="" width="40" height="40" />
                <span className="marketCollectionLabel"><b>{collection.name}</b><small>{en ? item.en : item.ru}</small></span>
                <span className="marketPriceValues" title={quote?.available === false && hasPrice ? (en ? 'Last available price' : 'Последняя доступная цена') : undefined}>
                  {hasPrice ? <Price value={floor} currency="gram" from /> : <small>{pending && !market ? (en ? 'Loading…' : 'Загрузка…') : '—'}</small>}
                </span>
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="card homeMarketHub" aria-labelledby="owl-market">
      <DetailLink to="/collections/charts" className="homeMarketBanner" onClick={() => lightHaptic()}>
        <div className="homeMarketBannerHead">
          <div>
            <h2 id="owl-market">{en ? 'Market & Price Charts' : 'Маркет и графики цен'}</h2>
            <p>{en ? 'Live game NFT data from GetGems' : 'Онлайн данные NFT игры с GetGems'}</p>
          </div>
          <span className="homeMarketCta">
            <span>{en ? 'Open' : 'Открыть'}</span>
            <span className="rowChevron" aria-hidden="true" />
          </span>
        </div>

        <div className="homeMarketSparkWrap" aria-hidden="true">
          <svg className="homeMarketSpark" viewBox="0 0 320 74" preserveAspectRatio="none">
            <defs>
              <linearGradient id="homeSparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffcc77" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#ffcc77" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="homeSparkStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d9a65b" stopOpacity="0.6" />
                <stop offset="55%" stopColor="#ffcc77" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffe5a8" stopOpacity="1" />
              </linearGradient>
            </defs>
            <line x1="0" y1="22" x2="320" y2="22" className="homeSparkGrid" />
            <line x1="0" y1="48" x2="320" y2="48" className="homeSparkGrid" />
            <path
              d="M0,58 C24,55 38,44 62,46 C86,48 102,34 128,37 C154,40 168,26 196,29 C220,31 238,18 264,20 C284,22 296,12 312,13 L312,74 L0,74 Z"
              fill="url(#homeSparkGrad)"
            />
            <path
              d="M0,58 C24,55 38,44 62,46 C86,48 102,34 128,37 C154,40 168,26 196,29 C220,31 238,18 264,20 C284,22 296,12 312,13"
              fill="none"
              stroke="url(#homeSparkStroke)"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            <circle cx="312" cy="13" r="7" fill="rgba(255, 204, 119, 0.22)" />
            <circle cx="312" cy="13" r="3.4" fill="#ffe5a8" stroke="#181819" strokeWidth="1.5" />
          </svg>
        </div>
      </DetailLink>

      <div
        ref={emblaRef}
        className="homeColMarquee emblaViewport"
        aria-label={en ? 'NOT Wise collections on GetGems' : 'Коллекции NOT Wise на GetGems'}
        aria-busy={!market && pending}
      >
        <div className="homeColTrack emblaContainer">
          {marqueeCollections.map(item => {
            const quote = market?.items.find(({ id }) => id === item.id);
            const trackedFloor = item.id === 'skins'
              ? lowestFloor(explorer?.items.filter(row => row.slug === 'owl-skin'))
              : item.id === 'items' ? lowestFloor(items?.items) : null;
            const floor = quote?.floor ?? trackedFloor ?? 0;
            const hasPrice = Number.isFinite(floor) && floor > 0;
            return (
              <div className="emblaSlide" key={item.id}>
                <DetailLink
                  to={`/collections/charts?slug=${encodeURIComponent(item.slug)}`}
                  className="homeColTile"
                  onClick={() => lightHaptic()}
                >
                  <span className="homeColSquare">
                    <img src={artSrc(`/brand/collections/${item.id}.png`)} alt="" width="56" height="56" draggable={false} />
                  </span>
                  <strong className="homeColName">{en ? item.en : item.ru}</strong>
                  <span className="homeColFloor" title={quote?.floor == null && trackedFloor !== null
                    ? (en ? 'Lowest price among tracked listings' : 'Минимальная цена среди отслеживаемых лотов')
                    : undefined}>
                    {hasPrice ? `${en ? 'from' : 'от'} ${fmtFloor.format(floor)}` : (pending && !market ? '…' : '—')}
                    {hasPrice && <img src={artSrc('/brand/tokens/gram.png')} alt="GRAM" width="12" height="12" draggable={false} />}
                  </span>
                </DetailLink>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
