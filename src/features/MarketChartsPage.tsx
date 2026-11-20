import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { GameArt } from '../ui/GameArt';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { Price } from './Price';
import {
  collectionMarket,
  explorerMarket,
  itemMarket,
  tokenMarket,
  type ExplorerBucket,
  type ExplorerLot,
} from './marketData';
import {
  expectedRingEnchantCost,
  marketAssetBySlug,
  marketCatalog,
  ringStatBonus,
  ringStatLabels,
  ringTierLabels,
  type MarketAsset,
  type MarketCategory,
  type RingStat,
  type RingTier,
} from './marketCatalog';
import { lightHaptic } from '../telegram/client';

type HistoryRange = '24h' | '7d' | '30d' | 'all';
type ChartMode = 'history' | 'curve';
type HistoryPoint = { ts: number; floor: number; count: number };

const fmtNum = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const fmtInt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const fmtUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const categories: { id: MarketCategory; label: string }[] = [
  { id: 'rings', label: 'Кольца' },
  { id: 'skins', label: 'Скины' },
  { id: 'items', label: 'Предметы' },
  { id: 'collections', label: 'Коллекции' },
];

const ranges: { id: HistoryRange; label: string }[] = [
  { id: '24h', label: '24ч' },
  { id: '7d', label: '7д' },
  { id: '30d', label: '30д' },
  { id: 'all', label: 'Всё' },
];

function formatGramCompact(val: number): string {
  if (val >= 1_000_000) return `${fmtNum.format(val / 1_000_000)}M`;
  if (val >= 10_000) return `${fmtNum.format(val / 1_000)}k`;
  return fmtNum.format(val);
}

function formatShortTime(ts: number, range: HistoryRange): string {
  const d = new Date(ts);
  if (range === '24h') {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
    ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function pluralLots(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} лот`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} лота`;
  return `${n} лотов`;
}

export function MarketChartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSlug = searchParams.get('slug') ?? '';
  const initialCategory = searchParams.get('category') as MarketCategory | null;
  const rawEnchantParam = searchParams.get('enchant');
  const parsedEnchant = rawEnchantParam !== null && rawEnchantParam !== '' ? Number(rawEnchantParam) : null;

  const defaultAsset = useMemo(() => {
    if (initialSlug && marketAssetBySlug.has(initialSlug)) return marketAssetBySlug.get(initialSlug)!;
    if (initialCategory) {
      const first = marketCatalog.find(a => a.category === initialCategory);
      if (first) return first;
    }
    return marketCatalog[0];
  }, [initialSlug, initialCategory]);

  const [selectedSlug, setSelectedSlug] = useState(defaultAsset.slug);
  // null means "Все" (all enchant levels combined) for enchantable items
  const [enchant, setEnchant] = useState<number | null>(
    parsedEnchant !== null && Number.isSafeInteger(parsedEnchant) && parsedEnchant >= 0 && parsedEnchant <= 20
      ? parsedEnchant
      : null,
  );
  const [chartMode, setChartMode] = useState<ChartMode>('history');
  const [range, setRange] = useState<HistoryRange>('7d');
  const [sortAsc, setSortAsc] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeEl = railRef.current?.querySelector<HTMLElement>('.radarEnchantChip.isActive');
    activeEl?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [enchant, selectedSlug]);

  const { data: explorer, pending: explorerPending } = explorerMarket.useSnapshot();
  const { data: cols } = collectionMarket.useSnapshot();
  const { data: itemsSnap } = itemMarket.useSnapshot();
  const { data: tokens } = tokenMarket.useSnapshot();

  useEffect(() => {
    explorerMarket.refresh(true);
  }, []);

  const asset: MarketAsset = marketAssetBySlug.get(selectedSlug) ?? marketCatalog[0];
  const category = asset.category;

  // Sync URL params softly without pushing history spam
  useEffect(() => {
    const next = new URLSearchParams();
    next.set('slug', asset.slug);
    if (asset.enchantable && enchant !== null) next.set('enchant', String(enchant));
    setSearchParams(next, { replace: true });
  }, [asset.slug, asset.enchantable, enchant, setSearchParams]);

  // If switching to non-enchantable asset, reset enchant & mode
  useEffect(() => {
    if (!asset.enchantable) {
      if (enchant !== null) setEnchant(null);
      if (chartMode === 'curve') setChartMode('history');
    }
  }, [asset.enchantable, enchant, chartMode]);

  const gramUsd = useMemo(() => {
    const raw = tokens?.items.find(t => t.symbol === 'GRAM')?.priceUsd;
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
    return cols?.gramToUsdt && cols.gramToUsdt > 0 ? cols.gramToUsdt : null;
  }, [tokens, cols]);

  // Index explorer buckets by slug -> Map<enchant, ExplorerBucket>
  const bucketsBySlug = useMemo(() => {
    const map = new Map<string, Map<number, ExplorerBucket>>();
    for (const b of explorer?.items ?? []) {
      let inner = map.get(b.slug);
      if (!inner) {
        inner = new Map();
        map.set(b.slug, inner);
      }
      inner.set(b.enchant, b);
    }
    return map;
  }, [explorer]);

  const assetBuckets = bucketsBySlug.get(asset.slug);
  const allAssetBuckets = useMemo(() => [...(assetBuckets?.values() ?? [])], [assetBuckets]);
  const totalAssetLots = useMemo(() => allAssetBuckets.reduce((sum, b) => sum + b.count, 0), [allAssetBuckets]);

  const activeBucket = asset.enchantable
    ? (enchant !== null ? assetBuckets?.get(enchant) : undefined)
    : assetBuckets?.get(0);

  // Fallback floor from collectionMarket / itemMarket if explorer bucket is empty or still loading
  const liveFloor = useMemo(() => {
    if (asset.enchantable && enchant === null) {
      const floors = allAssetBuckets.map(b => b.floor).filter(f => f > 0);
      if (floors.length) return Math.min(...floors);
    }
    if (activeBucket && activeBucket.floor > 0) return activeBucket.floor;
    if (asset.category === 'collections') {
      const colId = asset.slug.replace(/^col:/, '');
      const q = cols?.items.find(c => c.id === colId);
      return q?.floor && q.floor > 0 ? q.floor : null;
    }
    if (!asset.enchantable || enchant === 0 || enchant === null) {
      if (asset.slug === 'owl-skin') {
        const q = cols?.items.find(c => c.id === 'skins');
        return q?.floor && q.floor > 0 ? q.floor : null;
      }
      const q = itemsSnap?.items.find(i => i.id === asset.slug);
      return q?.floor && q.floor > 0 ? q.floor : null;
    }
    return null;
  }, [activeBucket, allAssetBuckets, asset, cols, itemsSnap, enchant]);

  const liveCount = useMemo(() => {
    if (asset.enchantable && enchant === null) return totalAssetLots;
    if (activeBucket) return activeBucket.count;
    if (asset.category === 'collections') {
      const colId = asset.slug.replace(/^col:/, '');
      return cols?.items.find(c => c.id === colId)?.supply ?? null;
    }
    return 0;
  }, [activeBucket, totalAssetLots, asset, cols, enchant]);

  // Fetch historical points for the selected (slug, enchant, range)
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setHistoryLoading(true);
    const enc = asset.enchantable ? (enchant ?? 0) : 0;
    const url = `/api/market/history?slug=${encodeURIComponent(asset.historySlug)}&enchant=${enc}&range=${range}`;
    fetch(url, { signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!controller.signal.aborted) {
          setHistoryPoints(Array.isArray(data?.points) ? data.points : []);
          setHistoryLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHistoryPoints([]);
          setHistoryLoading(false);
        }
      });
    return () => controller.abort();
  }, [asset.historySlug, asset.enchantable, enchant, range]);

  // Combine history points with live point if latest snapshot is fresher
  const seriesPoints = useMemo(() => {
    const pts = [...historyPoints];
    if (liveFloor && liveFloor > 0) {
      const last = pts[pts.length - 1];
      const now = Date.now();
      if (!last || now - last.ts > 30 * 60_000 || Math.abs(last.floor - liveFloor) > 0.001) {
        pts.push({ ts: now, floor: liveFloor, count: liveCount ?? 0 });
      }
    }
    return pts;
  }, [historyPoints, liveFloor, liveCount]);

  // Build Enchant Curve points (+0..+20) from live buckets
  const curvePoints = useMemo(() => {
    if (!asset.enchantable || !assetBuckets) return [];
    return [...assetBuckets.values()]
      .filter(b => b.floor > 0)
      .sort((a, b) => a.enchant - b.enchant)
      .map(b => ({ enchant: b.enchant, floor: b.floor, count: b.count }));
  }, [asset.enchantable, assetBuckets]);

  // Buy vs Enchant insight for rings & skins at +1..+12 using live Getgems prices of base item + enchant scroll
  const buyVsEnchant = useMemo(() => {
    const isRing = asset.category === 'rings';
    const isSkin = asset.slug === 'owl-skin';
    if ((!isRing && !isSkin) || enchant === null || enchant <= 0 || enchant > 12 || !liveFloor) return null;
    const baseFloor = assetBuckets?.get(0)?.floor
      ?? (isSkin ? cols?.items.find(c => c.id === 'skins')?.floor : itemsSnap?.items.find(i => i.id === asset.slug)?.floor)
      ?? 0;
    const scrollSlug = isSkin ? 'scroll-enchant-skin' : 'scroll-enchant-ring';
    const scrollFloor = bucketsBySlug.get(scrollSlug)?.get(0)?.floor
      ?? itemsSnap?.items.find(i => i.id === scrollSlug)?.floor ?? 0;
    const calc = expectedRingEnchantCost(enchant, baseFloor, scrollFloor);
    if (!calc) return null;
    const diffPct = ((liveFloor - calc.expectedGram) / calc.expectedGram) * 100;
    return { ...calc, baseFloor, scrollFloor, diffPct, isSkin };
  }, [asset, enchant, liveFloor, assetBuckets, cols, itemsSnap, bucketsBySlug]);

  // Lots sorted (supports "Все" across all enchant levels + single enchant level)
  const sortedLots: (ExplorerLot & { enchant: number })[] = useMemo(() => {
    const list: (ExplorerLot & { enchant: number })[] = [];
    if (asset.enchantable && enchant === null) {
      for (const b of allAssetBuckets) {
        for (const lot of b.lots) list.push({ ...lot, enchant: b.enchant });
      }
    } else if (activeBucket) {
      for (const lot of activeBucket.lots) list.push({ ...lot, enchant: activeBucket.enchant });
    }
    list.sort((a, b) => (sortAsc ? a.price - b.price : b.price - a.price));
    return list.slice(0, 24);
  }, [asset.enchantable, enchant, allAssetBuckets, activeBucket, sortAsc]);

  // Enchant rail levels to show (+0..+10 or up to highest active enchant)
  const maxActiveEnchant = useMemo(() => {
    if (!assetBuckets) return 10;
    let max = 10;
    for (const key of assetBuckets.keys()) {
      if (key > max) max = key;
    }
    return Math.min(20, max);
  }, [assetBuckets]);

  const enchantLevels = useMemo(
    () => Array.from({ length: maxActiveEnchant + 1 }, (_, i) => i),
    [maxActiveEnchant],
  );

  // Period change calculation
  const periodChange = useMemo(() => {
    if (seriesPoints.length < 2) return null;
    const first = seriesPoints[0].floor;
    const last = seriesPoints[seriesPoints.length - 1].floor;
    if (!(first > 0)) return null;
    return ((last - first) / first) * 100;
  }, [seriesPoints]);

  const selectCategory = (cat: MarketCategory) => {
    lightHaptic();
    if (cat === category) return;
    const first = marketCatalog.find(a => a.category === cat);
    if (first) {
      setSelectedSlug(first.slug);
      setEnchant(null);
    }
  };

  const selectRing = (stat: RingStat, tier: RingTier) => {
    lightHaptic();
    setSelectedSlug(`ring-${stat}-${tier}`);
  };

  const getgemsDisplayName = asset.enchantable && enchant !== null && enchant > 0
    ? `${asset.nameEn} +${enchant}`
    : asset.enchantable && enchant === null
      ? `${asset.nameEn} · все заточки`
      : asset.nameEn;

  const statMin = seriesPoints.length ? Math.min(...seriesPoints.map(p => p.floor)) : null;
  const statMax = seriesPoints.length ? Math.max(...seriesPoints.map(p => p.floor)) : null;

  return (
    <div className="marketRadar">
      {/* Category Tabs */}
      <div className="radarCatTabs" role="tablist" aria-label="Категории рынка">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={category === cat.id}
            className={category === cat.id ? 'isActive' : undefined}
            onClick={() => selectCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 1-Tap Item Selector Bar */}
      <button
        type="button"
        className="radarSelectorBar"
        onClick={() => { lightHaptic(); setPickerOpen(true); }}
        aria-haspopup="dialog"
      >
        <span className="radarSelectorIcon">
          <GameArt path={asset.icon} size={36} />
        </span>
        <span className="radarSelectorText">
          <strong>{asset.nameRu}{asset.enchantable && enchant !== null && enchant > 0 ? ` +${enchant}` : ''}</strong>
          <small>{getgemsDisplayName}</small>
        </span>
        <span className="radarSelectorAction">
          <span>Выбрать</span>
          <span className="rowChevron" aria-hidden="true" />
        </span>
      </button>

      {/* Inline 1-Tap Ring Matrix (Stat + Tier) */}
      {category === 'rings' && asset.ringStat && asset.ringTier && (
        <div className="radarRingMatrix" aria-label="Быстрый выбор кольца">
          <div className="radarPillRow">
            {(['str', 'ag', 'wit'] as RingStat[]).map(stat => {
              const attr = stat === 'str' ? 'strength' : stat === 'ag' ? 'agility' : 'wisdom';
              return (
                <button
                  key={stat}
                  type="button"
                  className={`radarPill ${asset.ringStat === stat ? 'isActive' : ''}`}
                  onClick={() => selectRing(stat, asset.ringTier!)}
                >
                  <GameAttribute name={attr} />
                  <span>{ringStatLabels[stat]}</span>
                </button>
              );
            })}
          </div>
          <div className="radarPillRow">
            {([1, 2, 3] as RingTier[]).map(tier => (
              <button
                key={tier}
                type="button"
                className={`radarPill radarTierPill ${asset.ringTier === tier ? 'isActive' : ''}`}
                onClick={() => selectRing(asset.ringStat!, tier)}
              >
                <span>{ringTierLabels[tier]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Enchant Rail (Все, +0 .. +20) for Rings & Skins */}
      {asset.enchantable && (
        <div className="radarEnchantWrap">
          <div className="radarEnchantHeader">
            <span>Уровень заточки</span>
            <small>
              {enchant === null
                ? 'Все уровни'
                : asset.ringStat && asset.ringTier
                  ? `+${ringStatBonus(asset.ringTier, enchant)} ${ringStatLabels[asset.ringStat]}`
                  : enchant > 0 ? `Заточка +${enchant}` : 'Без заточки'}
            </small>
          </div>
          <div className="radarRailViewport">
            <div ref={railRef} className="radarEnchantRail" role="listbox" aria-label="Уровень заточки">
              <button
                type="button"
                role="option"
                aria-selected={enchant === null}
                className={`radarEnchantChip ${enchant === null ? 'isActive' : ''} ${totalAssetLots > 0 ? 'hasLots' : ''}`}
                onClick={() => { lightHaptic(); setEnchant(null); }}
              >
                <strong>Все</strong>
                {totalAssetLots > 0 && <span className="radarChipCount">{totalAssetLots}</span>}
              </button>
              {enchantLevels.map(lvl => {
                const bucket = assetBuckets?.get(lvl);
                const count = bucket?.count ?? 0;
                const active = enchant === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`radarEnchantChip ${active ? 'isActive' : ''} ${count > 0 ? 'hasLots' : ''}`}
                    onClick={() => { lightHaptic(); setEnchant(lvl); }}
                  >
                    <strong>+{lvl}</strong>
                    {count > 0 && <span className="radarChipCount">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hero Chart Card */}
      <section className="card radarHeroCard" aria-busy={!explorer && explorerPending}>
        <div className="radarHeroTop">
          <div className="radarHeroMeta">
            <span className="radarHeroLabel">
              {chartMode === 'curve' ? 'Кривая заточки на Getgems' : 'Флор на Getgems'}
            </span>
            <button
              type="button"
              className="calcInfoBtn"
              aria-label="Как работают графики и заточка"
              onClick={() => { lightHaptic(); setInfoOpen(true); }}
            >
              <GameGlyph name="info" />
            </button>
          </div>

          <div className="radarPriceRow">
            <div className="radarPriceMain">
              {liveFloor ? (
                <>
                  <strong className="radarFloorVal">
                    {fmtNum.format(liveFloor)}
                    <span className="radarCurrency">GRAM</span>
                  </strong>
                  {gramUsd && (
                    <span className="radarUsdVal">≈ {fmtUsd.format(liveFloor * gramUsd)}</span>
                  )}
                </>
              ) : (
                <strong className="radarFloorVal radarFloorEmpty">
                  {explorerPending && !explorer ? 'Загрузка…' : 'Нет лотов'}
                </strong>
              )}
            </div>
            <div className="radarBadges">
              {periodChange !== null && chartMode === 'history' && (
                <span className={`radarDelta ${periodChange > 0 ? 'isUp' : periodChange < 0 ? 'isDown' : ''}`}>
                  {periodChange > 0 ? '+' : ''}{periodChange.toFixed(1)}%
                </span>
              )}
              {typeof liveCount === 'number' && liveCount > 0 && (
                <span className="radarLotsBadge">
                  {asset.category === 'collections' ? `${fmtInt.format(liveCount)} NFT` : pluralLots(liveCount)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mode & Range Controls */}
        <div className="radarChartControls">
          {asset.enchantable ? (
            <div className="radarModeSwitch" role="tablist" aria-label="Режим графика">
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === 'history'}
                className={chartMode === 'history' ? 'isActive' : undefined}
                onClick={() => { lightHaptic(); setChartMode('history'); }}
              >
                История
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === 'curve'}
                className={chartMode === 'curve' ? 'isActive' : undefined}
                onClick={() => { lightHaptic(); setChartMode('curve'); }}
              >
                Кривая +0…+{maxActiveEnchant}
              </button>
            </div>
          ) : (
            <span className="radarModeCaption">Динамика флора</span>
          )}

          {chartMode === 'history' && (
            <div className="radarRangePills" role="group" aria-label="Период графика">
              {ranges.map(r => (
                <button
                  key={r.id}
                  type="button"
                  className={range === r.id ? 'isActive' : undefined}
                  onClick={() => { lightHaptic(); setRange(r.id); }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Interactive SVG Chart */}
        {chartMode === 'history' ? (
          <InteractiveFloorChart
            points={seriesPoints}
            range={range}
            loading={historyLoading && !seriesPoints.length}
            canSwitchToCurve={Boolean(asset.enchantable && curvePoints.length >= 2)}
            onSwitchToCurve={() => { lightHaptic(); setChartMode('curve'); }}
          />
        ) : (
          <EnchantCurveChart
            points={curvePoints}
            activeEnchant={enchant}
            onSelectEnchant={lvl => { lightHaptic(); setEnchant(lvl); }}
          />
        )}

        {/* Stats Footer */}
        <div className="radarStatsRow">
          <div>
            <small>{chartMode === 'curve' ? 'Мин. (+0)' : `Мин. (${ranges.find(r => r.id === range)?.label})`}</small>
            <strong>
              {chartMode === 'curve'
                ? (curvePoints.length ? `${formatGramCompact(Math.min(...curvePoints.map(p => p.floor)))} GRAM` : '—')
                : (statMin ? `${formatGramCompact(statMin)} GRAM` : '—')}
            </strong>
          </div>
          <div>
            <small>{chartMode === 'curve' ? 'Макс. заточка' : `Макс. (${ranges.find(r => r.id === range)?.label})`}</small>
            <strong>
              {chartMode === 'curve'
                ? (curvePoints.length ? `${formatGramCompact(Math.max(...curvePoints.map(p => p.floor)))} GRAM` : '—')
                : (statMax ? `${formatGramCompact(statMax)} GRAM` : '—')}
            </strong>
          </div>
          <div>
            <small>{asset.category === 'collections' ? 'Выпущено' : 'В продаже'}</small>
            <strong>
              {typeof liveCount === 'number' && liveCount > 0
                ? (asset.category === 'collections' ? `${fmtInt.format(liveCount)} NFT` : pluralLots(liveCount))
                : '0'}
            </strong>
          </div>
        </div>
      </section>

      {/* Buy vs Self-Enchant Insight (Rings & Skins +1..+12) */}
      {buyVsEnchant && (
        <section className={`card radarInsightCard ${buyVsEnchant.diffPct <= 0 ? 'isCheaper' : 'isPricier'}`}>
          <div className="radarInsightHead">
            <strong>Купить +{enchant} vs точить самому</strong>
            <span className="radarInsightTag">
              {buyVsEnchant.diffPct <= -5
                ? `Выгоднее купить (${Math.round(buyVsEnchant.diffPct)}%)`
                : buyVsEnchant.diffPct >= 5
                  ? `Дороже на +${Math.round(buyVsEnchant.diffPct)}%`
                  : 'Около себестоимости'}
            </span>
          </div>
          <p>
            Себестоимость заточки до <b>+{enchant}</b> с учётом риска сгорания:{' '}
            <b>≈ {fmtNum.format(buyVsEnchant.expectedGram)} GRAM</b>{' '}
            <span>(~{buyVsEnchant.expectedRings} {buyVsEnchant.isSkin ? 'скинов' : 'колец'} и ~{buyVsEnchant.expectedScrolls} заточек).</span>
          </p>
          <p className="radarInsightPrices">
            По ценам маркета: база +0 — <b>{fmtNum.format(buyVsEnchant.baseFloor)} GRAM</b> · заточка — <b>{fmtNum.format(buyVsEnchant.scrollFloor)} GRAM</b>.
          </p>
        </section>
      )}

      {/* Live Getgems Lots List (STEPN-style) */}
      {asset.category !== 'collections' && (
        <section className="card radarLotsCard">
          <div className="radarLotsHeader">
            <div>
              <h2>Лоты на Getgems</h2>
              <small>{getgemsDisplayName}</small>
            </div>
            {sortedLots.length > 1 && (
              <button
                type="button"
                className="radarSortBtn"
                onClick={() => { lightHaptic(); setSortAsc(v => !v); }}
              >
                {sortAsc ? 'Дешёвые ↑' : 'Дорогие ↓'}
              </button>
            )}
          </div>

          {sortedLots.length > 0 ? (
            <div className="radarLotsList">
              {sortedLots.map(lot => (
                <a
                  key={lot.address}
                  className="radarLotRow"
                  href={lot.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="radarLotIcon">
                    <GameArt path={asset.icon} size={34} />
                  </span>
                  <span className="radarLotInfo">
                    <strong>{lot.name}</strong>
                    <small>
                      {asset.ringStat && asset.ringTier
                        ? `+${ringStatBonus(asset.ringTier, lot.enchant)} ${ringStatLabels[asset.ringStat]}${lot.enchant > 0 ? ` · заточка +${lot.enchant}` : ''}`
                        : lot.enchant > 0 ? `${asset.nameRu} · +${lot.enchant}` : asset.nameRu}
                    </small>
                  </span>
                  <span className="radarLotPrice">
                    <Price value={lot.price} currency="gram" />
                    {gramUsd && <small>≈ {fmtUsd.format(lot.price * gramUsd)}</small>}
                  </span>
                  <span className="rowChevron" aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : (
            <div className="radarEmptyLots">
              <p>
                {explorerPending && !explorer
                  ? 'Загружаем активные лоты с Getgems…'
                  : `Сейчас на Getgems нет активных лотов «${getgemsDisplayName}» с фиксированной ценой.`}
              </p>
              {asset.enchantable && curvePoints.length > 0 && (
                <div className="radarSuggestedEnchants">
                  <span>Есть в продаже:</span>
                  {curvePoints.slice(0, 6).map(pt => (
                    <button
                      key={pt.enchant}
                      type="button"
                      onClick={() => { lightHaptic(); setEnchant(pt.enchant); }}
                    >
                      +{pt.enchant} ({formatGramCompact(pt.floor)})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <a
            className="radarGetgemsBtn"
            href={asset.collectionUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span>Открыть все лоты на Getgems</span>
            <span className="externalMark" aria-hidden="true" />
          </a>
        </section>
      )}

      {asset.category === 'collections' && (
        <section className="card radarLotsCard">
          <p className="caption" style={{ margin: 0 }}>
            Для коллекций отслеживается минимальный флор и общее количество выпущенных NFT на Getgems каждый час.
          </p>
          <a
            className="radarGetgemsBtn"
            href={asset.collectionUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span>Открыть коллекцию на Getgems</span>
            <span className="externalMark" aria-hidden="true" />
          </a>
        </section>
      )}

      {/* Bottom-Sheet Item Picker with Instant Search */}
      {pickerOpen && (
        <MarketAssetPickerSheet
          initialCategory={category}
          selectedSlug={asset.slug}
          bucketsBySlug={bucketsBySlug}
          cols={cols?.items ?? []}
          items={itemsSnap?.items ?? []}
          onSelect={nextAsset => {
            lightHaptic();
            setSelectedSlug(nextAsset.slug);
            setEnchant(null);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Info Bottom-Sheet */}
      {infoOpen && (
        <MarketInfoSheet onClose={() => setInfoOpen(false)} />
      )}
    </div>
  );
}

function InteractiveFloorChart({
  points,
  range,
  loading,
  canSwitchToCurve,
  onSwitchToCurve,
}: {
  points: HistoryPoint[];
  range: HistoryRange;
  loading: boolean;
  canSwitchToCurve: boolean;
  onSwitchToCurve: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (loading) {
    return <div className="radarChartEmpty"><p>Загружаем историю флора…</p></div>;
  }

  if (points.length === 0) {
    return (
      <div className="radarChartEmpty">
        <p>Нет данных по этому уровню заточки за выбранный период.</p>
        {canSwitchToCurve && (
          <button type="button" className="radarInlineAction" onClick={onSwitchToCurve}>
            Смотреть кривую заточки (+0…+10)
          </button>
        )}
      </div>
    );
  }

  const width = 320;
  const height = 148;
  const padX = 12;
  const padTop = 18;
  const padBottom = 22;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const floors = points.map(p => p.floor);
  const minVal = Math.min(...floors);
  const maxVal = Math.max(...floors);
  const span = maxVal - minVal || Math.max(minVal * 0.12, 1);
  const yMin = Math.max(0, minVal - span * 0.15);
  const yMax = maxVal + span * 0.15;

  const coords = points.map((pt, idx) => {
    const x = points.length === 1 ? width / 2 : padX + (idx / (points.length - 1)) * innerW;
    const y = padTop + (1 - (pt.floor - yMin) / (yMax - yMin)) * innerH;
    return { x, y, pt };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = coords.length > 1
    ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(height - padBottom).toFixed(1)} L${coords[0].x.toFixed(1)},${(height - padBottom).toFixed(1)} Z`
    : '';

  const active = hoverIdx !== null ? coords[hoverIdx] : null;

  const handlePointer = (clientX: number) => {
    if (!svgRef.current || coords.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - relX);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setHoverIdx(best);
  };

  return (
    <div className="radarChartBox">
      {active && (
        <div className="radarScrubTooltip">
          <strong>{fmtNum.format(active.pt.floor)} GRAM</strong>
          <span>{formatShortTime(active.pt.ts, range)}{active.pt.count > 0 ? ` · ${pluralLots(active.pt.count)}` : ''}</span>
        </div>
      )}
      <svg
        ref={svgRef}
        className="radarSvg"
        viewBox={`0 0 ${width} ${height}`}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); handlePointer(e.clientX); }}
        onPointerMove={e => { if (e.buttons > 0 || e.pointerType === 'mouse') handlePointer(e.clientX); }}
        onPointerUp={() => setHoverIdx(null)}
        onPointerLeave={() => setHoverIdx(null)}
        onPointerCancel={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="radarGoldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffcc77" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#ffcc77" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal dashed grid */}
        {[0, 0.5, 1].map(ratio => {
          const y = padTop + ratio * innerH;
          const labelVal = yMax - ratio * (yMax - yMin);
          return (
            <g key={ratio}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} className="radarGridLine" />
              <text x={width - padX} y={y - 3} textAnchor="end" className="radarAxisText">
                {formatGramCompact(labelVal)}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#radarGoldGrad)" />}
        {coords.length > 1 && <path d={linePath} className="radarLinePath" />}

        {/* Single-point or endpoint dot */}
        {coords.length === 1 ? (
          <g>
            <circle cx={coords[0].x} cy={coords[0].y} r="10" fill="rgba(255, 204, 119, 0.18)" />
            <circle cx={coords[0].x} cy={coords[0].y} r="4.5" fill="#ffcc77" stroke="#111112" strokeWidth="2" />
          </g>
        ) : (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="3.5"
            fill="#ffcc77"
          />
        )}

        {/* Scrub crosshair */}
        {active && (
          <g>
            <line x1={active.x} y1={padTop} x2={active.x} y2={height - padBottom} className="radarCrosshair" />
            <circle cx={active.x} cy={active.y} r="5" fill="#ffcc77" stroke="#111112" strokeWidth="2" />
          </g>
        )}

        {/* X axis start/end labels */}
        {coords.length >= 2 && (
          <>
            <text x={padX} y={height - 5} textAnchor="start" className="radarAxisText">
              {formatShortTime(coords[0].pt.ts, range)}
            </text>
            <text x={width - padX} y={height - 5} textAnchor="end" className="radarAxisText">
              {formatShortTime(coords[coords.length - 1].pt.ts, range)}
            </text>
          </>
        )}
      </svg>

      {points.length === 1 && (
        <div className="radarSinglePointNote">
          <span>История накапливается каждый час — сейчас показан актуальный срез.</span>
          {canSwitchToCurve && (
            <button type="button" className="radarInlineAction" onClick={onSwitchToCurve}>
              Кривая заточки →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EnchantCurveChart({
  points,
  activeEnchant,
  onSelectEnchant,
}: {
  points: { enchant: number; floor: number; count: number }[];
  activeEnchant: number | null;
  onSelectEnchant: (lvl: number) => void;
}) {
  if (points.length === 0) {
    return <div className="radarChartEmpty"><p>Нет активных лотов с заточкой для построения кривой.</p></div>;
  }

  const width = 320;
  const height = 148;
  const padX = 20;
  const padTop = 20;
  const padBottom = 24;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const maxVal = Math.max(...points.map(p => p.floor));
  const minVal = Math.min(...points.map(p => p.floor));
  const yMin = Math.max(0, minVal * 0.85);
  const yMax = maxVal * 1.12 || 1;

  const coords = points.map((pt, i) => {
    const x = points.length === 1 ? width / 2 : padX + (i / (points.length - 1)) * innerW;
    const y = padTop + (1 - (pt.floor - yMin) / (yMax - yMin)) * innerH;
    return { x, y, pt };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = coords.length > 1
    ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(height - padBottom).toFixed(1)} L${coords[0].x.toFixed(1)},${(height - padBottom).toFixed(1)} Z`
    : '';

  return (
    <div className="radarChartBox">
      <svg className="radarSvg" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="radarCurveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffcc77" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#ffcc77" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(ratio => {
          const y = padTop + ratio * innerH;
          const labelVal = yMax - ratio * (yMax - yMin);
          return (
            <g key={ratio}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} className="radarGridLine" />
              <text x={width - padX} y={y - 3} textAnchor="end" className="radarAxisText">
                {formatGramCompact(labelVal)}
              </text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill="url(#radarCurveGrad)" />}
        {coords.length > 1 && <path d={linePath} className="radarLinePath" />}
        {coords.map(({ x, y, pt }) => {
          const isCurrent = pt.enchant === activeEnchant;
          return (
            <g
              key={pt.enchant}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectEnchant(pt.enchant)}
            >
              {isCurrent && <circle cx={x} cy={y} r="9" fill="rgba(255, 204, 119, 0.22)" />}
              <circle
                cx={x}
                cy={y}
                r={isCurrent ? 5 : 3.6}
                fill={isCurrent ? '#ffcc77' : '#d6b479'}
                stroke="#111112"
                strokeWidth="1.8"
              />
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                className={isCurrent ? 'radarAxisText isActive' : 'radarAxisText'}
              >
                +{pt.enchant}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="radarCurveHint">Нажми на точку, чтобы переключить уровень заточки и посмотреть лоты.</p>
    </div>
  );
}

function MarketAssetPickerSheet({
  initialCategory,
  selectedSlug,
  bucketsBySlug,
  cols,
  items,
  onSelect,
  onClose,
}: {
  initialCategory: MarketCategory;
  selectedSlug: string;
  bucketsBySlug: Map<string, Map<number, ExplorerBucket>>;
  cols: { id: string; floor: number | null; supply: number | null }[];
  items: { id: string; floor: number }[];
  onSelect: (asset: MarketAsset) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<MarketCategory | 'all'>(initialCategory);
  const [closing, setClosing] = useState(false);

  const triggerClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') triggerClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return marketCatalog.filter(asset => {
      if (catFilter !== 'all' && asset.category !== catFilter) return false;
      if (!q) return true;
      return asset.nameRu.toLowerCase().includes(q)
        || asset.nameEn.toLowerCase().includes(q)
        || asset.slug.toLowerCase().includes(q);
    });
  }, [query, catFilter]);

  const floorFor = (asset: MarketAsset): { floor: number | null; lots: number } => {
    const slugBuckets = bucketsBySlug.get(asset.slug);
    if (slugBuckets && slugBuckets.size > 0) {
      let min = Infinity;
      let totalLots = 0;
      for (const b of slugBuckets.values()) {
        if (b.floor > 0 && b.floor < min) min = b.floor;
        totalLots += b.count;
      }
      return { floor: Number.isFinite(min) ? min : null, lots: totalLots };
    }
    if (asset.category === 'collections') {
      const colId = asset.slug.replace(/^col:/, '');
      const c = cols.find(row => row.id === colId);
      return { floor: c?.floor ?? null, lots: 0 };
    }
    if (asset.slug === 'owl-skin') {
      const c = cols.find(row => row.id === 'skins');
      return { floor: c?.floor ?? null, lots: 0 };
    }
    const it = items.find(row => row.id === asset.slug);
    return { floor: it?.floor ?? null, lots: 0 };
  };

  return (
    <div
      className={`radarSheetBackdrop ${closing ? 'isClosing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Выбор предмета или коллекции"
      onClick={e => { if (e.target === e.currentTarget) triggerClose(); }}
    >
      <div className="radarSheetPanel">
        <div className="radarSheetHandle" aria-hidden="true" />
        <div className="radarSheetHeader">
          <h2>Выбрать предмет</h2>
          <button type="button" className="radarSheetDone" onClick={triggerClose}>Готово</button>
        </div>

        <label className="radarSearchField">
          <span className="sr-only">Поиск предмета</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск: кольцо, скин, жетон, свиток…"
            autoComplete="off"
          />
        </label>

        <div className="radarSheetCats">
          <button
            type="button"
            className={catFilter === 'all' ? 'isActive' : undefined}
            onClick={() => setCatFilter('all')}
          >
            Все
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={catFilter === cat.id ? 'isActive' : undefined}
              onClick={() => setCatFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="radarSheetList">
          {filtered.map(asset => {
            const { floor, lots } = floorFor(asset);
            const active = asset.slug === selectedSlug;
            return (
              <button
                key={asset.slug}
                type="button"
                className={`radarSheetRow ${active ? 'isSelected' : ''}`}
                onClick={() => onSelect(asset)}
              >
                <span className="radarSheetRowIcon">
                  <GameArt path={asset.icon} size={34} />
                </span>
                <span className="radarSheetRowMeta">
                  <strong>{asset.nameRu}</strong>
                  <small>{asset.nameEn}</small>
                </span>
                <span className="radarSheetRowPrice">
                  {floor ? (
                    <strong>от {formatGramCompact(floor)} GRAM</strong>
                  ) : (
                    <small>—</small>
                  )}
                  {lots > 0 && <small>{pluralLots(lots)}</small>}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="radarSheetEmpty">Ничего не найдено по запросу «{query}».</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketInfoSheet({ onClose }: { onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const triggerClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  };
  return (
    <div
      className={`radarSheetBackdrop ${closing ? 'isClosing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Как работают графики флора"
      onClick={e => { if (e.target === e.currentTarget) triggerClose(); }}
    >
      <div className="radarSheetPanel radarInfoPanel">
        <div className="radarSheetHandle" aria-hidden="true" />
        <div className="radarSheetHeader">
          <h2>Как работают графики</h2>
          <button type="button" className="radarSheetDone" onClick={triggerClose}>Понятно</button>
        </div>
        <div className="radarInfoBody">
          <p>
            <strong>Отслеживание по заточке (+0…+20):</strong> каждые 15 минут сервер сканирует активные лоты на Getgems, разбирает уровень заточки из названия (например, <code>Wooden Ring of Strength +6</code>) и сохраняет минимальный флор в историю.
          </p>
          <p>
            <strong>Кривая заточки:</strong> показывает, как растёт минимальная цена предмета от +0 к высоким уровням прямо сейчас.
          </p>
          <p>
            <strong>Купить vs точить:</strong> для колец с заточкой рассчитывается математическая себестоимость самостоятельной заточки с учётом риска сгорания после +3.
          </p>
        </div>
      </div>
    </div>
  );
}
