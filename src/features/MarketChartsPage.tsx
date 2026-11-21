import { AlbumLogo } from '../ui/AlbumLogo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { GameArt } from '../ui/GameArt';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { Price } from './Price';
import { getgemsNftUrl } from '../domain/ton-address';
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
  ringStatLabelsEn,
  ringTierLabels,
  ringTierLabelsEn,
  type MarketAsset,
  type MarketCategory,
  type RingStat,
  type RingTier,
} from './marketCatalog';
import { useGuideLocale } from './guideLocale';
import { lightHaptic, telegramPopup } from '../telegram/client';
import { artSrc } from '../ui/warmArt';
import { authData, profileRequest } from './guideProfile';
import { useBackOverlay, useGuideNavigation } from '../app/navigation';

const marketSubscribeUrl = 'https://t.me/+Q2SrPBHP8vRmMmNi';

type HistoryRange = '24h' | '7d' | '30d' | 'all';
type ChartMode = 'history' | 'curve';
type HistoryPoint = { ts: number; floor: number; count: number };
type MarketSale = { address: string; name: string; price: number; currency: string; at: number; image?: string; href: string };

const marketHistoryCache = new Map<string, HistoryPoint[]>();
const marketHistoryInflight = new Map<string, Promise<HistoryPoint[]>>();

function historyCacheKey(slug: string, enc: string, range: HistoryRange) {
  return `${slug}:${enc}:${range}`;
}

function fetchHistoryCached(slug: string, enc: string, range: HistoryRange): Promise<HistoryPoint[]> {
  const key = historyCacheKey(slug, enc, range);
  const cached = marketHistoryCache.get(key);
  if (cached) return Promise.resolve(cached);
  const inflight = marketHistoryInflight.get(key);
  if (inflight) return inflight;
  const url = `/api/market/history?slug=${encodeURIComponent(slug)}&enchant=${enc}&range=${range}`;
  const req = fetch(url)
    .then(res => (res.ok ? res.json() : null))
    .then(data => {
      const pts: HistoryPoint[] = Array.isArray(data?.points) ? data.points : [];
      marketHistoryCache.set(key, pts);
      return pts;
    })
    .catch(() => [] as HistoryPoint[])
    .finally(() => { marketHistoryInflight.delete(key); });
  marketHistoryInflight.set(key, req);
  return req;
}

const marketSalesCache = new Map<string, MarketSale[]>();
const marketSalesInflight = new Map<string, Promise<MarketSale[]>>();

function fetchSalesCached(slug: string): Promise<MarketSale[]> {
  const cached = marketSalesCache.get(slug);
  if (cached) return Promise.resolve(cached);
  const inflight = marketSalesInflight.get(slug);
  if (inflight) return inflight;
  const req = fetch(`/api/market/sales?slug=${encodeURIComponent(slug)}`)
    .then(res => (res.ok ? res.json() : null))
    .then(data => {
      const list: MarketSale[] = Array.isArray(data?.sales) ? data.sales : [];
      marketSalesCache.set(slug, list);
      return list;
    })
    .catch(() => [] as MarketSale[])
    .finally(() => { marketSalesInflight.delete(slug); });
  marketSalesInflight.set(slug, req);
  return req;
}

function convertSaleToGram(
  sale: MarketSale,
  tokenItems: { symbol: string; priceUsd: string | number | null }[] | undefined,
  gramUsd: number | null,
): number | null {
  const cur = (sale.currency || '').trim().toUpperCase();
  if (cur === 'GRAM' || cur === 'TON') return sale.price;
  if (!gramUsd || gramUsd <= 0) return null;
  if (cur === 'USD' || cur === 'USDT' || cur === 'USDC') return sale.price / gramUsd;
  const tok = tokenItems?.find(t => t.symbol.toUpperCase() === cur);
  const tokUsd = tok?.priceUsd != null ? Number(tok.priceUsd) : 0;
  if (Number.isFinite(tokUsd) && tokUsd > 0) {
    return (sale.price * tokUsd) / gramUsd;
  }
  return null;
}

const fmtNumRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const fmtNumEn = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const fmtIntRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const fmtIntEn = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmtUsdRu = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fmtUsdEn = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const categories: { id: MarketCategory; label: string; labelEn: string }[] = [
  { id: 'rings', label: 'Кольца', labelEn: 'Rings' },
  { id: 'skins', label: 'Скины', labelEn: 'Skins' },
  { id: 'items', label: 'Предметы', labelEn: 'Items' },
  { id: 'collections', label: 'Коллекции', labelEn: 'Collections' },
  { id: 'albums', label: 'Стикеры', labelEn: 'Stickers' },
];

function albumsByFloor(quotes: readonly { id: string; floor: number | null }[] = []) {
  const prices = new Map(quotes.map(({ id, floor }) => [id, floor]));
  const floorOf = (asset: MarketAsset) => {
    const floor = prices.get(asset.slug.slice(4));
    return floor != null && Number.isFinite(floor) && floor > 0 ? floor : Infinity;
  };
  return marketCatalog.filter(asset => asset.category === 'albums')
    .sort((a, b) => floorOf(a) - floorOf(b));
}

const ranges: { id: HistoryRange; label: string; labelEn: string }[] = [
  { id: '24h', label: '24ч', labelEn: '24h' },
  { id: '7d', label: '7д', labelEn: '7d' },
  { id: '30d', label: '30д', labelEn: '30d' },
  { id: 'all', label: 'Всё', labelEn: 'All' },
];

function formatGramCompact(val: number, en = false): string {
  const nf = en ? fmtNumEn : fmtNumRu;
  if (val >= 1_000_000) return `${nf.format(val / 1_000_000)}M`;
  if (val >= 10_000) return `${nf.format(val / 1_000)}k`;
  return nf.format(val);
}

function formatShortTime(ts: number, range: HistoryRange, en = false): string {
  const d = new Date(ts);
  const loc = en ? 'en-US' : 'ru-RU';
  if (range === '24h') {
    return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' }) +
    ', ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
}

function pluralLots(n: number, en = false): string {
  if (en) return n === 1 ? '1 lot' : `${n} lots`;
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} лот`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} лота`;
  return `${n} лотов`;
}

export function MarketChartsPage() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const fmtNum = en ? fmtNumEn : fmtNumRu;
  const fmtInt = en ? fmtIntEn : fmtIntRu;
  const fmtUsd = en ? fmtUsdEn : fmtUsdRu;
  const statLabels = en ? ringStatLabelsEn : ringStatLabels;
  const tierLabels = en ? ringTierLabelsEn : ringTierLabels;
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const slugParam = searchParams.get('slug') ?? '';
  const categoryParam = searchParams.get('category') as MarketCategory | null;
  const rawEnchantParam = searchParams.get('enchant');
  const parsedEnchant = rawEnchantParam !== null && rawEnchantParam !== '' ? Number(rawEnchantParam) : null;

  const { data: cols } = collectionMarket.useSnapshot();

  const asset: MarketAsset = useMemo(() => {
    if (slugParam && marketAssetBySlug.has(slugParam)) return marketAssetBySlug.get(slugParam)!;
    if (categoryParam === 'albums') return albumsByFloor(cols?.items)[0] ?? marketCatalog[0];
    if (categoryParam) {
      const first = marketCatalog.find(a => a.category === categoryParam);
      if (first) return first;
    }
    return marketCatalog[0];
  }, [slugParam, categoryParam, cols]);

  // null means "All" (all enchant levels combined) for enchantable items
  const enchant: number | null = useMemo(() => {
    if (!asset.enchantable) return null;
    return parsedEnchant !== null && Number.isSafeInteger(parsedEnchant) && parsedEnchant >= 0 && parsedEnchant <= 20
      ? parsedEnchant
      : null;
  }, [asset.enchantable, parsedEnchant]);

  const updateQuery = (nextSlug: string, nextEnchant: number | null) => {
    const nextAsset = marketAssetBySlug.get(nextSlug) ?? marketCatalog[0];
    const next = new URLSearchParams();
    next.set('slug', nextAsset.slug);
    if (nextAsset.enchantable && nextEnchant !== null) {
      next.set('enchant', String(nextEnchant));
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true, state: location.state });
    }
  };

  const [chartMode, setChartMode] = useState<ChartMode>('history');
  const [range, setRange] = useState<HistoryRange>('7d');
  const [sortAsc, setSortAsc] = useState(true);
  const [feedTab, setFeedTab] = useState<'lots' | 'sales'>('lots');
  const [fallbackLots, setFallbackLots] = useState<(ExplorerLot & { enchant: number })[]>([]);
  const [fallbackLotsLoading, setFallbackLotsLoading] = useState(false);
  const [salesState, setSalesState] = useState<{ slug: string; list: MarketSale[] }>(() => ({
    slug: asset.slug,
    list: marketSalesCache.get(asset.slug) ?? [],
  }));
  const [salesLoading, setSalesLoading] = useState(() => !marketSalesCache.has(asset.slug));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  useBackOverlay(pickerOpen, () => setPickerOpen(false));
  useBackOverlay(infoOpen, () => setInfoOpen(false));
  const railRef = useRef<HTMLDivElement>(null);
  const explorerRetryCount = useRef(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || enchant === null) return;
    const activeEl = rail.querySelector<HTMLElement>('.radarEnchantChip.isActive');
    if (!activeEl) return;
    const targetLeft = Math.max(0, activeEl.offsetLeft - (rail.clientWidth - activeEl.offsetWidth) / 2);
    rail.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }, [enchant, asset.slug]);

  const { data: explorer, pending: explorerPending } = explorerMarket.useSnapshot();
  const { data: itemsSnap } = itemMarket.useSnapshot();
  const { data: tokens } = tokenMarket.useSnapshot();

  const navigation = useGuideNavigation();
  const [subState, setSubState] = useState<'checking' | 'granted' | 'required'>(() => {
    try {
      const raw = JSON.parse(sessionStorage.getItem('notwise.guide.market-sub.v1') ?? 'null');
      if (raw?.ok === true && typeof raw.ts === 'number' && Date.now() - raw.ts < 15 * 60_000) return 'granted';
    } catch { /* ignore */ }
    return authData() ? 'checking' : 'required';
  });
  const [subBusy, setSubBusy] = useState(false);
  const [subMessage, setSubMessage] = useState('');

  useEffect(() => {
    if (subState !== 'checking') return;
    if (!authData()) {
      setSubState('required');
      return;
    }
    const abort = new AbortController();
    profileRequest<{ subscribed?: boolean }>({ action: 'check_subscription' }, abort.signal)
      .then(res => {
        if (res?.subscribed) {
          try { sessionStorage.setItem('notwise.guide.market-sub.v1', JSON.stringify({ ok: true, ts: Date.now() })); } catch { /* ignore */ }
          setSubState('granted');
        } else {
          setSubState('required');
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setSubState('required');
      });
    return () => abort.abort();
  }, [subState]);

  async function verifyChannelSubscription() {
    lightHaptic();
    if (!authData()) {
      setSubMessage(en ? 'Open the guide in Telegram to verify your @cryptoeone subscription.' : 'Открой гайд в Telegram, чтобы проверить подписку на @cryptoeone.');
      return;
    }
    setSubBusy(true);
    setSubMessage('');
    try {
      const res = await profileRequest<{ subscribed?: boolean }>({ action: 'check_subscription' });
      if (res?.subscribed) {
        try { sessionStorage.setItem('notwise.guide.market-sub.v1', JSON.stringify({ ok: true, ts: Date.now() })); } catch { /* ignore */ }
        setSubState('granted');
      } else {
        setSubMessage(en ? 'Subscription to @cryptoeone not found yet. Subscribe and tap "Check subscription".' : 'Подписка на @cryptoeone пока не найдена. Подпишись на канал и нажми «Проверить подписку».');
      }
    } catch {
      setSubMessage(en ? 'Could not verify subscription right now. Please try again in a moment.' : 'Не удалось проверить подписку. Попробуй ещё раз через пару секунд.');
    } finally {
      setSubBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const cached = marketSalesCache.get(asset.slug);
    if (cached) {
      setSalesState({ slug: asset.slug, list: cached });
      setSalesLoading(false);
      return;
    }
    setSalesLoading(true);
    void fetchSalesCached(asset.slug).then(list => {
      if (!cancelled) {
        setSalesState({ slug: asset.slug, list });
        setSalesLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [asset.slug]);

  const cachedSales = marketSalesCache.get(asset.slug);
  const salesList = cachedSales ?? (salesState.slug === asset.slug ? salesState.list : []);
  const effectiveSalesLoading = cachedSales === undefined && salesLoading;

  useEffect(() => {
    explorerMarket.refresh();
  }, []);

  // Auto-retry at most once if explorer came back empty during a cold server refresh
  useEffect(() => {
    if (explorer?.items && explorer.items.length > 0) {
      explorerRetryCount.current = 0;
      return;
    }
    if (explorerPending || explorerRetryCount.current >= 1) return;
    const t = window.setTimeout(() => {
      explorerRetryCount.current += 1;
      explorerMarket.refresh(true);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [explorerPending, explorer]);

  const category = asset.category;

  // Sync URL params softly only when actually changed, preserving location.state (guideDetail)
  useEffect(() => {
    const next = new URLSearchParams();
    next.set('slug', asset.slug);
    if (asset.enchantable && enchant !== null) next.set('enchant', String(enchant));
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true, state: location.state });
    }
  }, [asset.slug, asset.enchantable, enchant, searchParams, setSearchParams, location.state]);

  // If switching to non-enchantable asset, reset mode
  useEffect(() => {
    if (!asset.enchantable && chartMode === 'curve') {
      setChartMode('history');
    }
  }, [asset.enchantable, chartMode]);

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
    if (asset.slug.startsWith('col:')) {
      const colId = asset.slug.replace(/^col:/, '');
      const q = cols?.items.find(c => c.id === colId);
      return q?.floor && q.floor > 0 ? q.floor : null;
    }
    const explorerLoaded = Boolean(explorer?.items && explorer.items.length > 0);
    if (asset.enchantable && enchant !== null && explorerLoaded) {
      return null;
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
  }, [activeBucket, allAssetBuckets, asset, cols, explorer, itemsSnap, enchant]);

  const liveCount = useMemo(() => {
    if (asset.enchantable && enchant === null) return totalAssetLots;
    if (activeBucket) return activeBucket.count;
    if (asset.slug.startsWith('col:')) {
      const colId = asset.slug.replace(/^col:/, '');
      return cols?.items.find(c => c.id === colId)?.supply ?? null;
    }
    return 0;
  }, [activeBucket, totalAssetLots, asset, cols, enchant]);

  // Fetch historical points for the selected (slug, enchant, range), keyed strictly so stale charts never flash
  const enc = asset.enchantable ? (enchant === null ? 'all' : String(enchant)) : '0';
  const activeHistoryKey = historyCacheKey(asset.historySlug, enc, range);
  const [historyState, setHistoryState] = useState<{ key: string; points: HistoryPoint[] }>(() => ({
    key: activeHistoryKey,
    points: marketHistoryCache.get(activeHistoryKey) ?? [],
  }));
  const [historyLoading, setHistoryLoading] = useState(() => !marketHistoryCache.has(activeHistoryKey));
  const initialLoadDoneRef = useRef(false);
  const prefetchedMountRef = useRef(false);

  // Prefetch main category defaults, ranges & +0..+3 enchants on initial entry so switching tabs is instant
  useEffect(() => {
    if (prefetchedMountRef.current) return;
    prefetchedMountRef.current = true;
    const defaults: [string, string, HistoryRange][] = [
      ['ring-str-1', 'all', '7d'],
      ['owl-skin', 'all', '7d'],
      ['scroll-enchant-ring', '0', '7d'],
      ['col:genesis', '0', '7d'],
      ['floppy-100k', '0', '7d'],
      ['voucher-100k', '0', '7d'],
      ['col:album-1', '0', '7d'],
      [asset.historySlug, enc, '24h'],
      [asset.historySlug, enc, '7d'],
      [asset.historySlug, enc, '30d'],
      [asset.historySlug, enc, 'all'],
    ];
    if (asset.enchantable) {
      defaults.push(
        [asset.historySlug, '0', '7d'],
        [asset.historySlug, '1', '7d'],
        [asset.historySlug, '2', '7d'],
        [asset.historySlug, '3', '7d'],
      );
    }
    for (const [s, e, r] of defaults) {
      void fetchHistoryCached(s, e, r);
    }
    for (const s of ['ring-str-1', 'owl-skin', 'scroll-enchant-ring', 'col:genesis']) {
      void fetchSalesCached(s);
    }
  }, [asset.historySlug, asset.enchantable, enc]);

  useEffect(() => {
    let cancelled = false;
    const isInitial = !initialLoadDoneRef.current;
    const startedAt = performance.now();
    const minLoaderMs = isInitial ? 900 : 0;
    let timer = 0;

    const cached = marketHistoryCache.get(activeHistoryKey);
    if (cached && !isInitial) {
      setHistoryState({ key: activeHistoryKey, points: cached });
      setHistoryLoading(false);
      return;
    }

    if (isInitial || !cached) setHistoryLoading(true);

    const finishLoading = (pts: HistoryPoint[]) => {
      const remaining = isInitial ? Math.max(0, minLoaderMs - (performance.now() - startedAt)) : 0;
      const apply = () => {
        if (cancelled) return;
        initialLoadDoneRef.current = true;
        setHistoryState({ key: activeHistoryKey, points: pts });
        setHistoryLoading(false);
      };
      if (remaining === 0) apply();
      else timer = window.setTimeout(apply, remaining);
    };

    void fetchHistoryCached(asset.historySlug, enc, range).then(finishLoading);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeHistoryKey, asset.historySlug, enc, range]);

  const cachedHistory = marketHistoryCache.get(activeHistoryKey);
  const historyReady = cachedHistory !== undefined || historyState.key === activeHistoryKey;
  const historyPoints = cachedHistory ?? (historyState.key === activeHistoryKey ? historyState.points : []);
  const effectiveHistoryLoading = cachedHistory === undefined && (historyLoading || !historyReady);

  // Combine history points with live point if latest snapshot is fresher (only when points belong to active key)
  const seriesPoints = useMemo(() => {
    if (!historyReady) return [];
    const pts = [...historyPoints];
    if (liveFloor && liveFloor > 0) {
      const last = pts[pts.length - 1];
      const now = Date.now();
      if (!last || now - last.ts > 30 * 60_000 || Math.abs(last.floor - liveFloor) > 0.001) {
        pts.push({ ts: now, floor: liveFloor, count: liveCount ?? 0 });
      }
    }
    return pts;
  }, [historyReady, historyPoints, liveFloor, liveCount]);

  // Build Enchant Curve points (+0..+20) from live buckets
  const curvePoints = useMemo(() => {
    if (!asset.enchantable || !assetBuckets) return [];
    return [...assetBuckets.values()]
      .filter(b => b.floor > 0)
      .sort((a, b) => a.enchant - b.enchant)
      .map(b => ({ enchant: b.enchant, floor: b.floor, count: b.count }));
  }, [asset.enchantable, assetBuckets]);

  // Buy vs Enchant insight for rings & skins at +1..+12 using the exact +0 floor of THIS model + enchanter scroll floor
  const buyVsEnchant = useMemo(() => {
    const isRing = asset.category === 'rings';
    const isSkin = asset.slug === 'owl-skin';
    if ((!isRing && !isSkin) || enchant === null || enchant <= 0 || enchant > 12 || !liveFloor) return null;
    // Use ONLY the +0 floor of this specific model (never fall back to overall market floor across higher enchants).
    const baseFloor = assetBuckets?.get(0)?.floor ?? 0;
    if (!(baseFloor > 0)) return null;
    const scrollSlug = isSkin ? 'scroll-enchant-skin' : 'scroll-enchant-ring';
    const scrollFloor = bucketsBySlug.get(scrollSlug)?.get(0)?.floor
      ?? itemsSnap?.items.find(i => i.id === scrollSlug)?.floor ?? 0;
    const calc = expectedRingEnchantCost(enchant, baseFloor, scrollFloor);
    if (!calc) return null;
    const diffPct = ((liveFloor - calc.expectedGram) / calc.expectedGram) * 100;
    return { ...calc, baseFloor, scrollFloor, diffPct, isSkin };
  }, [asset, enchant, liveFloor, assetBuckets, itemsSnap, bucketsBySlug]);

  // Lots sorted (supports "Все" across all enchant levels + single enchant level + on-demand fallback for collections/stickers)
  const sortedLots: (ExplorerLot & { enchant: number })[] = useMemo(() => {
    const list: (ExplorerLot & { enchant: number })[] = [];
    if (asset.enchantable && enchant === null) {
      for (const b of allAssetBuckets) {
        for (const lot of b.lots) list.push({ ...lot, enchant: b.enchant });
      }
    } else if (activeBucket) {
      for (const lot of activeBucket.lots) list.push({ ...lot, enchant: activeBucket.enchant });
    }
    const sourceList = list.length > 0 ? list : (enchant === null || enchant === 0 ? fallbackLots : fallbackLots.filter(l => l.enchant === enchant));
    const sorted = [...sourceList];
    sorted.sort((a, b) => (sortAsc ? a.price - b.price : b.price - a.price));
    return sorted.slice(0, 24);
  }, [asset.enchantable, enchant, allAssetBuckets, activeBucket, fallbackLots, sortAsc]);

  useEffect(() => {
    const hasExplorerLots = allAssetBuckets.some(b => b.lots.length > 0);
    if (hasExplorerLots) {
      setFallbackLots([]);
      setFallbackLotsLoading(false);
      return;
    }
    if (!asset.slug.startsWith('col:') && asset.slug !== 'owl-skin') {
      setFallbackLots([]);
      return;
    }
    const controller = new AbortController();
    setFallbackLotsLoading(true);
    fetch(`/api/market/lots?slug=${encodeURIComponent(asset.slug)}`, { signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!controller.signal.aborted) {
          setFallbackLots(Array.isArray(data?.lots) ? data.lots : []);
          setFallbackLotsLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFallbackLots([]);
          setFallbackLotsLoading(false);
        }
      });
    return () => controller.abort();
  }, [asset.slug, allAssetBuckets]);

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
    if (cat === 'albums') {
      setSearchParams({ category: cat }, { replace: true, state: location.state });
      return;
    }
    const first = marketCatalog.find(a => a.category === cat);
    if (first) {
      updateQuery(first.slug, null);
    }
  };

  const selectRing = (stat: RingStat, tier: RingTier) => {
    lightHaptic();
    updateQuery(`ring-${stat}-${tier}`, enchant);
  };

  const assetTitle = (a: MarketAsset) => (en ? a.nameEn : a.nameRu);

  const getgemsDisplayName = asset.enchantable && enchant !== null && enchant > 0
    ? `${asset.nameEn} +${enchant}`
    : asset.enchantable && enchant === null
      ? `${asset.nameEn} · ${en ? 'all enchants' : 'все заточки'}`
      : asset.nameEn;

  const statMin = seriesPoints.length ? Math.min(...seriesPoints.map(p => p.floor)) : null;
  const statMax = seriesPoints.length ? Math.max(...seriesPoints.map(p => p.floor)) : null;
  const activeRangeObj = ranges.find(r => r.id === range);
  const activeRangeLabel = en ? activeRangeObj?.labelEn : activeRangeObj?.label;

  return (
    <div className="marketRadar">
      {/* 1-Tap Item Selector Bar */}
      <button
        type="button"
        className="radarSelectorBar"
        onClick={() => { lightHaptic(); setPickerOpen(true); }}
        aria-haspopup="dialog"
      >
        <span className="radarSelectorIcon">
          {asset.albumId ? <AlbumLogo id={asset.albumId} size={36}/> : <GameArt path={asset.icon} size={36} />}
        </span>
        <span className="radarSelectorText">
          <strong style={{ whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', lineHeight: 1.25 }}>
            {assetTitle(asset)}{asset.enchantable && enchant !== null && enchant > 0 ? ` +${enchant}` : ''}
          </strong>
          <small style={{ whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', lineHeight: 1.25 }}>
            {getgemsDisplayName}
          </small>
        </span>
        <span className="radarSelectorAction">
          <span>{en ? 'Select' : 'Выбрать'}</span>
          <span className="rowChevron" aria-hidden="true" />
        </span>
      </button>

      {/* Category Tabs */}
      <div className="radarCatTabs" role="tablist" aria-label={en ? 'Market categories' : 'Категории рынка'}>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={category === cat.id}
            className={category === cat.id ? 'isActive' : undefined}
            onClick={() => selectCategory(cat.id)}
          >
            {en ? cat.labelEn : cat.label}
          </button>
        ))}
      </div>

      {/* Inline 1-Tap Ring Matrix (Stat + Tier) */}
      {category === 'rings' && asset.ringStat && asset.ringTier && (
        <div className="radarRingMatrix" aria-label={en ? 'Quick ring selector' : 'Быстрый выбор кольца'}>
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
                  <span>{statLabels[stat]}</span>
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
                <span>{tierLabels[tier]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Enchant Rail (Все, +0 .. +20) for Rings & Skins */}
      {asset.enchantable && (
        <div className="radarEnchantWrap">
          <div className="radarEnchantHeader">
            <span>{en ? 'Enchant level' : 'Уровень заточки'}</span>
            <small>
              {enchant === null
                ? (en ? 'All levels' : 'Все уровни')
                : asset.ringStat && asset.ringTier
                  ? `+${ringStatBonus(asset.ringTier, enchant)} ${statLabels[asset.ringStat]}`
                  : enchant > 0 ? (en ? `Enchant +${enchant}` : `Заточка +${enchant}`) : (en ? 'Base (+0)' : 'Без заточки')}
            </small>
          </div>
          <div className="radarRailViewport">
            <div ref={railRef} className="radarEnchantRail" role="listbox" aria-label={en ? 'Enchant level' : 'Уровень заточки'}>
              <button
                type="button"
                role="option"
                aria-selected={enchant === null}
                className={`radarEnchantChip ${enchant === null ? 'isActive' : ''} ${totalAssetLots > 0 ? 'hasLots' : ''}`}
                onClick={() => { lightHaptic(); updateQuery(asset.slug, null); }}
              >
                <strong>{en ? 'All' : 'Все'}</strong>
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
                    onClick={() => { lightHaptic(); updateQuery(asset.slug, lvl); }}
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
              {chartMode === 'curve'
                ? (en ? 'Getgems floor by enchant level' : 'Флор по уровням заточки на Getgems')
                : (en ? 'Floor on Getgems' : 'Флор на Getgems')}
            </span>
            <button
              type="button"
              className="calcInfoBtn"
              aria-label={en ? 'How charts and enchanting work' : 'Как работают графики и заточка'}
              onClick={() => { lightHaptic(); setInfoOpen(true); }}
            >
              <GameGlyph name="info" />
            </button>
          </div>

          <div className="radarPriceRow">
            <AnimatePresence mode="wait" initial={false}>
              {!initialLoadDoneRef.current && effectiveHistoryLoading ? (
                <motion.div
                  key="price-skeleton"
                  className="radarPriceRowInner"
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="radarPriceMain">
                    <span className="radarShimmerPill isFloor" aria-hidden="true" />
                    <span className="radarShimmerPill isUsd" aria-hidden="true" />
                  </div>
                  <div className="radarBadges">
                    <span className="radarShimmerPill isBadge" aria-hidden="true" />
                    <span className="radarShimmerPill isBadge" aria-hidden="true" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="price-live"
                  className="radarPriceRowInner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
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
                        {explorerPending && !explorer ? (en ? 'Loading…' : 'Загрузка…') : (en ? 'No lots' : 'Нет лотов')}
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
                        {asset.slug.startsWith('col:') ? `${fmtInt.format(liveCount)} NFT` : pluralLots(liveCount, en)}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mode & Range Controls */}
        <div className="radarChartControls">
          {asset.enchantable ? (
            <div className="radarModeSwitch" role="tablist" aria-label={en ? 'Chart mode' : 'Режим графика'}>
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === 'history'}
                className={chartMode === 'history' ? 'isActive' : undefined}
                onClick={() => { lightHaptic(); setChartMode('history'); }}
              >
                {en ? 'History' : 'История'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === 'curve'}
                className={chartMode === 'curve' ? 'isActive' : undefined}
                onClick={() => { lightHaptic(); setChartMode('curve'); }}
              >
                {en ? `By enchant level` : `По уровням заточки`}
              </button>
            </div>
          ) : (
            <span className="radarModeCaption">{en ? 'Floor history' : 'Динамика флора'}</span>
          )}

          {chartMode === 'history' && (
            <div className="radarRangePills" role="group" aria-label={en ? 'Chart range' : 'Период графика'}>
              {ranges.map(r => (
                <button
                  key={r.id}
                  type="button"
                  className={range === r.id ? 'isActive' : undefined}
                  onClick={() => { lightHaptic(); setRange(r.id); }}
                >
                  {en ? r.labelEn : r.label}
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
            loading={effectiveHistoryLoading}
            maxActiveEnchant={maxActiveEnchant}
            canSwitchToCurve={Boolean(asset.enchantable && curvePoints.length >= 2)}
            onSwitchToCurve={() => { lightHaptic(); setChartMode('curve'); }}
            en={en}
          />
        ) : (
          <EnchantCurveChart
            points={curvePoints}
            activeEnchant={enchant}
            onSelectEnchant={lvl => { lightHaptic(); updateQuery(asset.slug, lvl); }}
            en={en}
          />
        )}

        {/* Stats Footer */}
        <div className="radarStatsRow">
          <div>
            <small>{chartMode === 'curve' ? (en ? 'Min (+0)' : 'Мин. (+0)') : `${en ? 'Min' : 'Мин.'} (${activeRangeLabel})`}</small>
            {effectiveHistoryLoading ? (
              <span className="radarShimmerPill isStat" aria-hidden="true" />
            ) : (
              <strong className="radarStatValueFade">
                {chartMode === 'curve'
                  ? (curvePoints.length ? `${formatGramCompact(Math.min(...curvePoints.map(p => p.floor)), en)} GRAM` : '—')
                  : (statMin ? `${formatGramCompact(statMin, en)} GRAM` : '—')}
              </strong>
            )}
          </div>
          <div>
            <small>{chartMode === 'curve' ? (en ? 'Max enchant' : 'Макс. заточка') : `${en ? 'Max' : 'Макс.'} (${activeRangeLabel})`}</small>
            {effectiveHistoryLoading ? (
              <span className="radarShimmerPill isStat" aria-hidden="true" />
            ) : (
              <strong className="radarStatValueFade">
                {chartMode === 'curve'
                  ? (curvePoints.length ? `${formatGramCompact(Math.max(...curvePoints.map(p => p.floor)), en)} GRAM` : '—')
                  : (statMax ? `${formatGramCompact(statMax, en)} GRAM` : '—')}
              </strong>
            )}
          </div>
          <div>
            <small>{asset.slug.startsWith('col:') ? (en ? 'Minted' : 'Выпущено') : (en ? 'Listed' : 'В продаже')}</small>
            {effectiveHistoryLoading ? (
              <span className="radarShimmerPill isStat" aria-hidden="true" />
            ) : (
              <strong className="radarStatValueFade">
                {typeof liveCount === 'number' && liveCount > 0
                  ? (asset.slug.startsWith('col:') ? `${fmtInt.format(liveCount)} NFT` : pluralLots(liveCount, en))
                  : '0'}
              </strong>
            )}
          </div>
        </div>
      </section>

      {/* Buy vs Self-Enchant Insight (Rings & Skins +1..+12) */}
      {buyVsEnchant && (
        <section className={`card radarInsightCard ${buyVsEnchant.diffPct <= 0 ? 'isCheaper' : 'isPricier'}`}>
          <div className="radarInsightHead">
            <strong>{en ? `Buy +${enchant} vs self-enchant` : `Купить +${enchant} vs точить самому`}</strong>
            <span className="radarInsightTag">
              {buyVsEnchant.diffPct <= -5
                ? (en ? `Cheaper to buy (${Math.round(buyVsEnchant.diffPct)}%)` : `Выгоднее купить (${Math.round(buyVsEnchant.diffPct)}%)`)
                : buyVsEnchant.diffPct >= 5
                  ? (en ? `+${Math.round(buyVsEnchant.diffPct)}% above craft cost` : `Дороже на +${Math.round(buyVsEnchant.diffPct)}%`)
                  : (en ? 'Near craft cost' : 'Около себестоимости')}
            </span>
          </div>
          {en ? (
            buyVsEnchant.survivalChance >= 99.99 ? (
              <p>
                Self-enchant cost to <b>+{enchant}</b> (100% safe, no burn risk):{' '}
                <b>≈ {fmtNum.format(buyVsEnchant.expectedGram)} GRAM</b>{' '}
                <span>(1 {buyVsEnchant.isSkin ? 'skin' : 'ring'} + {enchant} {enchant === 1 ? 'scroll' : 'scrolls'}).</span>
              </p>
            ) : (
              <p>
                Expected self-enchant cost to <b>+{enchant}</b> with burn risk from +4 ({Math.round(buyVsEnchant.survivalChance)}% survival from +0):{' '}
                <b>≈ {fmtNum.format(buyVsEnchant.expectedGram)} GRAM</b>{' '}
                <span>(~{buyVsEnchant.expectedRings} {buyVsEnchant.isSkin ? 'skins' : 'rings'} and ~{buyVsEnchant.expectedScrolls} scrolls).</span>
              </p>
            )
          ) : (
            buyVsEnchant.survivalChance >= 99.99 ? (
              <p>
                Себестоимость заточки до <b>+{enchant}</b> (100% шанс, без сгорания):{' '}
                <b>≈ {fmtNum.format(buyVsEnchant.expectedGram)} GRAM</b>{' '}
                <span>(1 {buyVsEnchant.isSkin ? 'скин' : 'кольцо'} + {enchant} {enchant === 1 ? 'заточка' : 'заточки'}).</span>
              </p>
            ) : (
              <p>
                Себестоимость заточки до <b>+{enchant}</b> с учётом риска сгорания с +4 (шанс дойти с +0: {Math.round(buyVsEnchant.survivalChance)}%):{' '}
                <b>≈ {fmtNum.format(buyVsEnchant.expectedGram)} GRAM</b>{' '}
                <span>(~{buyVsEnchant.expectedRings} {buyVsEnchant.isSkin ? 'скинов' : 'колец'} и ~{buyVsEnchant.expectedScrolls} заточек).</span>
              </p>
            )
          )}
          <p className="radarInsightPrices">
            {en ? (
              <>Market floor: base +0 — <b>{fmtNum.format(buyVsEnchant.baseFloor)} GRAM</b> · enchanter — <b>{fmtNum.format(buyVsEnchant.scrollFloor)} GRAM</b>.</>
            ) : (
              <>По ценам маркета: база +0 — <b>{fmtNum.format(buyVsEnchant.baseFloor)} GRAM</b> · заточка — <b>{fmtNum.format(buyVsEnchant.scrollFloor)} GRAM</b>.</>
            )}
          </p>
        </section>
      )}

      {/* Live Getgems Lots & Sales Card */}
      <section className="card radarLotsCard">
        <div className="radarLotsHeader">
          <div>
            <div className="radarFeedTabs" role="tablist" aria-label={en ? 'Listings and sales' : 'Лоты и продажи'}>
              <button
                type="button"
                role="tab"
                aria-selected={feedTab === 'lots'}
                className={feedTab === 'lots' ? 'isActive' : undefined}
                onClick={() => { lightHaptic(); setFeedTab('lots'); }}
              >
                {en ? 'Listings' : 'Лоты'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={feedTab === 'sales'}
                className={feedTab === 'sales' ? 'isActive' : undefined}
                onClick={() => { lightHaptic(); setFeedTab('sales'); }}
              >
                {en ? 'Sales' : 'Продажи'}
              </button>
            </div>
            <small>
              {getgemsDisplayName}
              {feedTab === 'sales' ? (en ? ' · last 30 days' : ' · за последние 30 дней') : ''}
            </small>
          </div>
          {feedTab === 'lots' && sortedLots.length > 1 && (
            <button
              type="button"
              className="radarSortBtn"
              onClick={() => { lightHaptic(); setSortAsc(v => !v); }}
            >
              {sortAsc ? (en ? 'Cheapest ↑' : 'Дешёвые ↑') : (en ? 'Priciest ↓' : 'Дорогие ↓')}
            </button>
          )}
        </div>

        {feedTab === 'lots' ? (
          sortedLots.length > 0 ? (
            <div className="radarLotsList">
              {sortedLots.map(lot => (
                <a
                  key={lot.address}
                  className="radarLotRow"
                  href={getgemsNftUrl(lot.address)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="radarLotIcon">
                    <LotThumb src={lot.image} fallback={asset.icon} albumId={asset.albumId} />
                  </span>
                  <span className="radarLotInfo">
                    <strong>{lot.name}</strong>
                    <small>
                      {asset.ringStat && asset.ringTier
                        ? `+${ringStatBonus(asset.ringTier, lot.enchant)} ${statLabels[asset.ringStat]}${lot.enchant > 0 ? (en ? ` · enchant +${lot.enchant}` : ` · заточка +${lot.enchant}`) : ''}`
                        : lot.enchant > 0 ? `${assetTitle(asset)} · +${lot.enchant}` : assetTitle(asset)}
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
                {(explorerPending && !explorer) || fallbackLotsLoading
                  ? (en ? 'Loading active listings from Getgems…' : 'Загружаем активные лоты с Getgems…')
                  : asset.slug.startsWith('col:') && asset.slug !== 'col:genesis'
                    ? (en ? 'Collection floor price and supply on Getgems.' : 'Минимальный флор и объём коллекции на Getgems.')
                    : (en
                      ? `No fixed-price "${getgemsDisplayName}" listings on Getgems right now.`
                      : `Сейчас на Getgems нет активных лотов «${getgemsDisplayName}» с фиксированной ценой.`)}
              </p>
              {asset.enchantable && curvePoints.length > 0 && (
                <div className="radarSuggestedEnchants">
                  <span>{en ? 'Available:' : 'Есть в продаже:'}</span>
                  {curvePoints.slice(0, 6).map(pt => (
                    <button
                      key={pt.enchant}
                      type="button"
                      onClick={() => { lightHaptic(); updateQuery(asset.slug, pt.enchant); }}
                    >
                      +{pt.enchant} ({formatGramCompact(pt.floor, en)})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        ) : effectiveSalesLoading ? (
          <div className="radarEmptyLots">
            <p>{en ? 'Loading recent sales from Getgems…' : 'Загружаем последние продажи с Getgems…'}</p>
          </div>
        ) : salesList.length > 0 ? (
          <div className="radarLotsList">
            {salesList.map((sale, idx) => {
              const gramPrice = convertSaleToGram(sale, tokens?.items, gramUsd);
              const displayPrice = gramPrice ?? sale.price;
              const isGram = gramPrice !== null;
              return (
                <a
                  key={`${sale.address}-${sale.at}-${idx}`}
                  className="radarLotRow"
                  href={sale.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="radarLotIcon">
                    <LotThumb src={sale.image} fallback={asset.icon} albumId={asset.albumId} />
                  </span>
                  <span className="radarLotInfo">
                    <strong>{sale.name}</strong>
                    <small>{formatShortTime(sale.at, '30d', en)}</small>
                  </span>
                  <span className="radarLotPrice">
                    {isGram ? (
                      <Price value={displayPrice} currency="gram" />
                    ) : (
                      <strong>{fmtNum.format(sale.price)} {sale.currency}</strong>
                    )}
                    {isGram && gramUsd && <small>≈ {fmtUsd.format(displayPrice * gramUsd)}</small>}
                  </span>
                  <span className="rowChevron" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        ) : (
          <div className="radarEmptyLots">
            <p>{en ? 'No recent sales found for this asset yet.' : 'Недавних продаж по этой позиции пока не найдено.'}</p>
          </div>
        )}

        <a
          className="radarGetgemsBtn"
          href={asset.collectionUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span>{en ? 'Open all listings on Getgems' : 'Открыть на Getgems'}</span>
          <span className="externalMark" aria-hidden="true" />
        </a>
      </section>

      {/* Bottom-Sheet Item Picker with Instant Search */}
      {pickerOpen && (
        <MarketAssetPickerSheet
          initialCategory={category}
          selectedSlug={asset.slug}
          bucketsBySlug={bucketsBySlug}
          cols={cols?.items ?? []}
          items={itemsSnap?.items ?? []}
          en={en}
          onSelect={nextAsset => {
            lightHaptic();
            updateQuery(nextAsset.slug, null);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Info Bottom-Sheet */}
      {infoOpen && (
        <MarketInfoSheet en={en} onClose={() => setInfoOpen(false)} />
      )}

      {/* CryptoOne Subscription Gate */}
      <AnimatePresence>
        {subState === 'required' && (
          <motion.div
            className="radarSubGateBackdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-sub-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="radarSubGateWrap">
              <motion.img
                className="radarSubGateHamster"
                src={artSrc('/brand/hamster.png')}
                width="520"
                height="564"
                alt={en ? 'CryptoOne Hamster' : 'Хомяк CryptoOne'}
                initial={{ y: 48, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 36, opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.36, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="radarSubGateDialog"
                initial={{ y: 18, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 14, opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="radarSubGateHead">
                  <h2 id="market-sub-title">
                    {en ? 'Market analytics is for CryptoOne subscribers only' : 'Аналитика маркета только для подписчиков CryptoOne'}
                  </h2>
                  <p>
                    {en
                      ? 'Subscribe to @cryptoeone to unlock floor charts, Getgems listings, and self-enchant cost insights.'
                      : 'Подпишись на канал @cryptoeone, чтобы открыть графики флора, лоты Getgems и расчёт себестоимости заточки.'}
                  </p>
                </div>
                {subMessage && <p className="radarSubGateStatus" role="status">{subMessage}</p>}
                <div className="radarSubGateActions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      lightHaptic();
                      const tg = telegramPopup();
                      if (tg?.openTelegramLink) tg.openTelegramLink(marketSubscribeUrl);
                      else window.open(marketSubscribeUrl, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {en ? 'Subscribe' : 'Подписаться'}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={subBusy}
                    onClick={() => void verifyChannelSubscription()}
                  >
                    {subBusy ? (en ? 'Checking…' : 'Проверяем…') : (en ? 'Check subscription' : 'Проверить подписку')}
                  </button>
                  <button
                    type="button"
                    className="radarSubGateBack"
                    onClick={() => { lightHaptic(); navigation.back(); }}
                  >
                    {en ? 'Back' : 'Назад'}
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LotThumb({ src, fallback, albumId }: { src?: string; fallback: string; albumId?: number }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (src && failedSrc !== src) {
    return (
      <img
        key={src}
        className="radarLotImg"
        src={src}
        alt=""
        width={34}
        height={34}
        loading="eager"
        decoding="async"
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return albumId ? <AlbumLogo id={albumId} size={34} /> : <GameArt path={fallback} size={34} />;
}

function InteractiveFloorChart({
  points,
  range,
  loading,
  maxActiveEnchant,
  canSwitchToCurve,
  onSwitchToCurve,
  en,
}: {
  points: HistoryPoint[];
  range: HistoryRange;
  loading: boolean;
  maxActiveEnchant: number;
  canSwitchToCurve: boolean;
  onSwitchToCurve: () => void;
  en: boolean;
}) {
  const fmtNum = en ? fmtNumEn : fmtNumRu;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 320;
  const height = 148;
  const padX = 12;
  const padTop = 18;
  const padBottom = 22;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const floors = points.map(p => p.floor);
  const minVal = points.length ? Math.min(...floors) : 0;
  const maxVal = points.length ? Math.max(...floors) : 0;
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

  if (loading) {
    return (
      <div
        className="radarChartSkeleton"
        role="status"
        aria-label={en ? 'Loading chart' : 'Загружаем график'}
      >
        <div className="radarSkeletonBars" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <p>{en ? 'Loading chart…' : 'Загружаем график…'}</p>
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="radarChartEmpty">
        <p>{en ? 'No data for this enchant level in the selected range.' : 'Нет данных по этому уровню заточки за выбранный период.'}</p>
        {canSwitchToCurve && (
          <button type="button" className="radarInlineAction" onClick={onSwitchToCurve}>
            {en ? `View prices by enchant level (+0…+${maxActiveEnchant})` : `Смотреть цены по уровням заточки (+0…+${maxActiveEnchant})`}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="radarChartBox">
          {active && (
        <div className="radarScrubTooltip">
          <strong>{fmtNum.format(active.pt.floor)} GRAM</strong>
          <span>{formatShortTime(active.pt.ts, range, en)}{active.pt.count > 0 ? ` · ${pluralLots(active.pt.count, en)}` : ''}</span>
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
          const labelVal = yMax * (1 - ratio);
          return (
            <g key={ratio}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} className="radarGridLine" />
              <text x={width - padX} y={y - 3} textAnchor="end" className="radarAxisText">
                {formatGramCompact(labelVal, en)}
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
              {formatShortTime(coords[0].pt.ts, range, en)}
            </text>
            <text x={width - padX} y={height - 5} textAnchor="end" className="radarAxisText">
              {formatShortTime(coords[coords.length - 1].pt.ts, range, en)}
            </text>
          </>
        )}
      </svg>

          {points.length === 1 && (
            <div className="radarSinglePointNote">
              <span>{en ? 'Only one price point available so far.' : 'Пока доступна одна точка цены.'}</span>
              {canSwitchToCurve && (
                <button type="button" className="radarInlineAction" onClick={onSwitchToCurve}>
                  {en ? 'By enchant level →' : 'По уровням заточки →'}
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
  en,
}: {
  points: { enchant: number; floor: number; count: number }[];
  activeEnchant: number | null;
  onSelectEnchant: (lvl: number) => void;
  en: boolean;
}) {
  if (points.length === 0) {
    return (
      <div className="radarChartEmpty">
        <p>{en ? 'No active listings to compare prices by enchant level.' : 'Нет активных лотов для сравнения цен по уровням заточки.'}</p>
      </div>
    );
  }

  const width = 320;
  const height = 148;
  const padX = 20;
  const padTop = 20;
  const padBottom = 24;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const maxVal = Math.max(...points.map(p => p.floor));
  const yMax = maxVal * 1.12 || 1;
  const baseline = height - padBottom;
  const slotWidth = innerW / points.length;
  const barWidth = Math.min(26, slotWidth * 0.65);
  const coords = points.map((pt, i) => ({
    x: padX + (i + 0.5) * slotWidth,
    y: baseline - (pt.floor / yMax) * innerH,
    pt,
  }));

  return (
    <div className="radarChartBox">
      <svg className="radarSvg" viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map(ratio => {
          const y = padTop + ratio * innerH;
          const labelVal = yMax * (1 - ratio);
          return (
            <g key={ratio}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} className="radarGridLine" />
              <text x={width - padX} y={y - 3} textAnchor="end" className="radarAxisText">
                {formatGramCompact(labelVal, en)}
              </text>
            </g>
          );
        })}
        {coords.map(({ x, y, pt }) => {
          const isCurrent = pt.enchant === activeEnchant;
          const label = `+${pt.enchant} · ${formatGramCompact(pt.floor, en)} GRAM`;
          return (
            <g
              key={pt.enchant}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={isCurrent}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectEnchant(pt.enchant)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectEnchant(pt.enchant);
                }
              }}
            >
              <title>{label}</title>
              <rect x={x - slotWidth / 2} y={padTop} width={slotWidth} height={height - padTop} fill="transparent" />
              <rect x={x - barWidth / 2} y={y} width={barWidth} height={baseline - y} rx="2"
                fill={isCurrent ? '#ffcc77' : '#a88b60'} />
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
      <p className="radarCurveHint">
        {en
          ? 'Tap a bar to switch the enchant level and view listings.'
          : 'Нажми на столбик, чтобы переключить уровень заточки и посмотреть лоты.'}
      </p>
    </div>
  );
}

function MarketAssetPickerSheet({
  initialCategory,
  selectedSlug,
  bucketsBySlug,
  cols,
  items,
  en,
  onSelect,
  onClose,
}: {
  initialCategory: MarketCategory;
  selectedSlug: string;
  bucketsBySlug: Map<string, Map<number, ExplorerBucket>>;
  cols: { id: string; floor: number | null; supply: number | null }[];
  items: { id: string; floor: number }[];
  en: boolean;
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
    const catalog = catFilter === 'albums' ? albumsByFloor(cols) : marketCatalog;
    return catalog.filter(asset => {
      if (catFilter !== 'all' && asset.category !== catFilter) return false;
      if (!q) return true;
      return asset.nameRu.toLowerCase().includes(q)
        || asset.nameEn.toLowerCase().includes(q)
        || asset.slug.toLowerCase().includes(q);
    });
  }, [query, catFilter, cols]);

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
    if (asset.slug.startsWith('col:')) {
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
      aria-label={en ? 'Select item or collection' : 'Выбор предмета или коллекции'}
      onClick={e => { if (e.target === e.currentTarget) triggerClose(); }}
    >
      <div className="radarSheetPanel">
        <div className="radarSheetHandle" aria-hidden="true" />
        <div className="radarSheetHeader">
          <h2>{en ? 'Select item' : 'Выбрать предмет'}</h2>
          <button type="button" className="radarSheetDone" onClick={triggerClose}>{en ? 'Done' : 'Готово'}</button>
        </div>

        <label className="radarSearchField">
          <span className="sr-only">{en ? 'Search item' : 'Поиск предмета'}</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={en ? 'Search: ring, skin, jetton, scroll…' : 'Поиск: кольцо, скин, жетон, свиток…'}
            autoComplete="off"
          />
        </label>

        <div className="radarSheetCats">
          <button
            type="button"
            className={catFilter === 'all' ? 'isActive' : undefined}
            onClick={() => setCatFilter('all')}
          >
            {en ? 'All' : 'Все'}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={catFilter === cat.id ? 'isActive' : undefined}
              onClick={() => setCatFilter(cat.id)}
            >
              {en ? cat.labelEn : cat.label}
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
                  {asset.albumId ? <AlbumLogo id={asset.albumId} size={34}/> : <GameArt path={asset.icon} size={34} />}
                </span>
                <span className="radarSheetRowMeta">
                  <strong>{en ? asset.nameEn : asset.nameRu}</strong>
                  <small>{en ? asset.nameRu : asset.nameEn}</small>
                </span>
                <span className="radarSheetRowPrice">
                  {floor ? (
                    <strong>{en ? `from ${formatGramCompact(floor, en)} GRAM` : `от ${formatGramCompact(floor, en)} GRAM`}</strong>
                  ) : (
                    <small>—</small>
                  )}
                  {lots > 0 && <small>{pluralLots(lots, en)}</small>}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="radarSheetEmpty">
              {en ? `No results for "${query}".` : `Ничего не найдено по запросу «${query}».`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketInfoSheet({ en, onClose }: { en: boolean; onClose: () => void }) {
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
      aria-label={en ? 'How floor charts work' : 'Как работают графики флора'}
      onClick={e => { if (e.target === e.currentTarget) triggerClose(); }}
    >
      <div className="radarSheetPanel radarInfoPanel">
        <div className="radarSheetHandle" aria-hidden="true" />
        <div className="radarSheetHeader">
          <h2>{en ? 'How charts work' : 'Как работают графики'}</h2>
          <button type="button" className="radarSheetDone" onClick={triggerClose}>{en ? 'Got it' : 'Понятно'}</button>
        </div>
        <div className="radarInfoBody">
          {en ? (
            <>
              <p>
                <strong>Floor by enchant (+0…+20):</strong> the lowest active fixed-price listing on Getgems tracked separately for each enchant level.
              </p>
              <p>
                <strong>Prices by enchant level.</strong> The chart shows the lowest listing price at each available level.
              </p>
              <p>
                <strong>Buy vs self-enchant:</strong> compares the market price of a ready item against the expected self-enchant cost, accounting for burn risk above +3.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Флор по заточке (+0…+20):</strong> минимальная актуальная цена на Getgems отдельно для каждого уровня заточки.
              </p>
              <p>
                <strong>Цены по уровням заточки.</strong> График показывает минимальную цену предмета на каждом уровне, где есть лоты.
              </p>
              <p>
                <strong>Купить vs точить:</strong> сравнивает цену готового предмета со средней себестоимостью самостоятельной заточки с учётом риска сгорания после +3.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
