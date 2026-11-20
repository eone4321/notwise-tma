import { useEffect, useRef } from 'react';
import { Price } from './Price';
import { DetailLink } from '../ui/DetailLink';
import { artSrc } from '../ui/warmArt';
import { collectionMarket } from './marketData';
import collections from './market-collections';
import { lightHaptic } from '../telegram/client';

const singleFeatured = [
  { id: 'eggs', description: 'Коллекционные яйца' },
  { id: 'genesis', description: 'Первая коллекция сов' },
  { id: 'skins', description: 'Скины сов' },
  { id: 'items', description: 'Игровые предметы' },
];

const marqueeCollections = [
  { id: 'genesis', label: 'NOT Wise', slug: 'col:genesis' },
  { id: 'skins', label: 'Скины', slug: 'owl-skin' },
  { id: 'items', label: 'Предметы', slug: 'ring-str-1' },
  { id: 'owlings', label: 'Owlings', slug: 'col:owlings' },
  { id: 'eggs', label: 'NFT-яйца', slug: 'col:eggs' },
  { id: 'classics', label: 'Стикеры', slug: 'col:classics' },
  { id: 'domains', label: 'Домены', slug: 'col:domains' },
  { id: 'family', label: 'Family', slug: 'col:family' },
] as const;

const fmtFloor = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

export function OwlPrices({ only }: { only?: 'eggs' | 'genesis' | 'items' } = {}) {
  const { data: market, pending } = collectionMarket.useSnapshot();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pauseUntilRef = useRef(0);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (only) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let carry = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const el = scrollerRef.current;
      if (el && !draggingRef.current && now >= pauseUntilRef.current) {
        const half = el.scrollWidth / 2;
        if (half > 0) {
          carry += (dt / 1000) * 26;
          if (carry >= 1) {
            const px = Math.floor(carry);
            carry -= px;
            el.scrollLeft += px;
            if (el.scrollLeft >= half) {
              el.scrollLeft -= half;
            }
          }
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [only]);

  const pauseAutoScroll = (ms = 2400) => {
    pauseUntilRef.current = performance.now() + ms;
  };

  // Subpage single-collection mode stays unchanged
  if (only) {
    return (
      <section className="card owlMarket" aria-labelledby="owl-market">
        <div className="marketHeading">
          <h2 id="owl-market">{only === 'eggs' ? 'Цена NFT-яйца' : only === 'items' ? 'Цена NFT-предметов' : 'Цены на NFT в Not Wise'}</h2>
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
                <span className="marketCollectionLabel"><b>{collection.name}</b><small>{item.description}</small></span>
                <span className="marketPriceValues" title={quote?.available === false && hasPrice ? 'Последняя доступная цена' : undefined}>
                  {hasPrice ? <Price value={floor} currency="gram" from /> : <small>{pending && !market ? 'Загрузка…' : '—'}</small>}
                </span>
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  // Home screen: "Маркет и графики цен" hero + smooth left-scrolling square collections marquee
  const renderSquareCard = (item: typeof marqueeCollections[number], dupKey: string) => {
    const quote = market?.items.find(({ id }) => id === item.id);
    const floor = quote?.floor ?? 0;
    const hasPrice = Number.isFinite(floor) && floor > 0;
    return (
      <DetailLink
        key={`${dupKey}-${item.id}`}
        to={`/collections/charts?slug=${encodeURIComponent(item.slug)}`}
        className="homeColTile"
        onClick={() => lightHaptic()}
      >
        <span className="homeColSquare">
          <img src={artSrc(`/brand/collections/${item.id}.png`)} alt="" width="52" height="52" loading="lazy" />
        </span>
        <strong className="homeColName">{item.label}</strong>
        <span className="homeColFloor">
          {hasPrice ? `от ${fmtFloor.format(floor)}` : (pending && !market ? '…' : '—')}
          {hasPrice && <img src={artSrc('/brand/tokens/gram.png')} alt="GRAM" width="12" height="12" />}
        </span>
      </DetailLink>
    );
  };

  return (
    <section className="card homeMarketHub" aria-labelledby="owl-market">
      <DetailLink to="/collections/charts" className="homeMarketBanner" onClick={() => lightHaptic()}>
        <div className="homeMarketBannerHead">
          <div>
            <h2 id="owl-market">Маркет и графики цен</h2>
            <p>Флоры Getgems по заточке +0…+20 и живые лоты</p>
          </div>
          <span className="homeMarketCta">
            <span>Открыть</span>
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
        ref={scrollerRef}
        className="homeColMarquee"
        aria-label="Коллекции NOT Wise на Getgems"
        aria-busy={!market && pending}
        onTouchStart={() => { draggingRef.current = true; pauseAutoScroll(2800); }}
        onTouchEnd={() => { draggingRef.current = false; pauseAutoScroll(2200); }}
        onTouchCancel={() => { draggingRef.current = false; pauseAutoScroll(2200); }}
        onPointerDown={e => { if (e.pointerType !== 'touch') { draggingRef.current = true; pauseAutoScroll(2800); } }}
        onPointerUp={() => { draggingRef.current = false; pauseAutoScroll(2200); }}
        onPointerCancel={() => { draggingRef.current = false; pauseAutoScroll(2200); }}
        onWheel={() => pauseAutoScroll(2400)}
      >
        <div className="homeColTrack">
          <div className="homeColGroup">
            {marqueeCollections.map(item => renderSquareCard(item, 'a'))}
          </div>
          <div className="homeColGroup" aria-hidden="true">
            {marqueeCollections.map(item => renderSquareCard(item, 'b'))}
          </div>
        </div>
      </div>
    </section>
  );
}
