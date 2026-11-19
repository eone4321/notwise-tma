import { useSyncExternalStore } from 'react';

export type TokenQuote = {
  symbol: string;
  priceUsd: string | null;
  marketCapUsd?: number | null;
  fdvUsd?: number | null;
  fetchedAt: string | null;
  status: 'fresh' | 'stale' | 'unavailable';
};
type CollectionQuote = { id: string; floor: number | null; supply: number | null; available?: boolean };
type Collections = { items: CollectionQuote[]; gramToUsdt: number | null; albumIssue?: Record<number, number> };

const storageAge = 24 * 60 * 60_000;

function resource<T extends { items: unknown[] }>(
  endpoint: string, ttl: number, merge: (old: T | null, next: T) => T,
) {
  const key = 'notwise.market.v2:' + endpoint;
  const listeners = new Set<() => void>();
  let cached: T | null = null;
  let timestamp = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (typeof saved?.time === 'number' && Date.now() - saved.time < storageAge && Array.isArray(saved?.value?.items)) {
      cached = saved.value;
      timestamp = saved.time;
    }
  } catch { /* Storage is optional. */ }
  let state = { data: cached, pending: !cached, stale: !!cached && Date.now() - timestamp >= ttl };
  let fetching: Promise<void> | null = null;
  const update = (next: typeof state) => { state = next; listeners.forEach(notify => notify()); };

  function refresh(force = false) {
    if (fetching || (!force && Date.now() - timestamp < ttl)) return;
    update({ ...state, pending: true });
    fetching = (async () => {
      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(6500) });
        if (!response.ok) throw new Error('market unavailable');
        const quote = await response.json();
        if (!Array.isArray(quote?.items)) throw new Error('empty market');
        cached = merge(cached, quote);
        timestamp = Date.now();
        update({ data: cached, pending: false, stale: false });
        try { localStorage.setItem(key, JSON.stringify({ time: timestamp, value: cached })); } catch { /* Storage is optional. */ }
      } catch {
        update({ data: cached, pending: false, stale: !!cached });
      } finally {
        fetching = null;
      }
    })();
  }

  return {
    refresh,
    useSnapshot: () => useSyncExternalStore(
      subscribe,
      () => state,
    ),
  };

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }
}

export const tokenMarket = resource<{items: TokenQuote[]}>('/api/market/tokens', 120_000, (old, next) => ({
  items: next.items.map(item => {
    const previous = old?.items.find(row => row.symbol === item.symbol);
    const usingPrevious = !item.priceUsd && !!previous?.priceUsd;
    return {
      ...item,
      priceUsd: item.priceUsd ?? previous?.priceUsd ?? null,
      fetchedAt: usingPrevious ? previous.fetchedAt : item.fetchedAt,
      status: usingPrevious ? 'stale' : item.status,
      marketCapUsd: item.marketCapUsd ?? previous?.marketCapUsd,
      fdvUsd: item.fdvUsd ?? previous?.fdvUsd,
    };
  }),
}));

export const collectionMarket = resource<Collections>('/api/market/collections', 300_000, (old, next) => ({
  items: next.items.map(item => {
    const previous = old?.items.find(row => row.id === item.id);
    if (item.available !== false) return item;
    return { ...item, floor: item.floor ?? previous?.floor ?? null, supply: item.supply ?? previous?.supply ?? null };
  }),
  albumIssue: next.albumIssue,
  gramToUsdt: next.gramToUsdt ?? old?.gramToUsdt ?? null,
}));

export const itemMarket = resource<{
  items: { id: string; floor: number }[];
  status: 'ready' | 'unavailable';
  mintQuotes?: Record<string, number>;
}>('/api/market/items', 120_000, (_, next) => next);

export function startMarketUpdates() {
  const refresh = () => {
    if (document.hidden) return;
    tokenMarket.refresh();
    collectionMarket.refresh();
    itemMarket.refresh();
  };
  refresh();
  const timer = window.setInterval(refresh, 60_000);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', refresh);
  };
}
