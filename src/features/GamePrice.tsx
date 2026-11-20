import type { ReactNode } from 'react';
import { estimateGramForStars } from '../domain/purchase-prices';
import { tokenMarket } from './marketData';
import { Price } from './Price';

function useGramRate() {
  const { data, stale, pending } = tokenMarket.useSnapshot();
  const quote = data?.items.find(row => row.symbol === 'GRAM');
  const usd = Number(quote?.priceUsd);
  return {
    usd: Number.isFinite(usd) && usd > 0 && quote?.status !== 'unavailable' ? usd : null,
    stale: stale || quote?.status === 'stale',
    pending,
  };
}

function RateEstimate({ stale, children }: { stale: boolean; children: ReactNode }) {
  return <span className="rateEstimate" title={stale ? 'По сохранённому курсу GRAM' : 'По текущей котировке GRAM'} data-stale={stale || undefined}>
    {stale && <span className="sr-only">По сохранённому курсу. </span>}{children}
  </span>;
}

export function GramEstimate({ stars, showUnavailable, purpose, usdLayout }: { stars: number; showUnavailable?: boolean; purpose?: 'game' | 'support'; usdLayout?: 'inline' | 'stack' }) {
  const { usd, pending, stale } = useGramRate();
  const value = usd === null ? null : estimateGramForStars(stars, usd, purpose);
  if (value === null) return showUnavailable ? <span className="gramUnavailable"
    aria-label={pending ? 'Курс GRAM загружается' : 'Курс GRAM недоступен'}>—</span> : null;
  return <RateEstimate stale={stale}><Price value={value} currency="gram" approximate usdLayout={usdLayout}/></RateEstimate>;
}

export function StarsAndGram({ stars }: { stars: number }) {
  return <span className="starsAndGram"><Price value={stars} currency="stars"/><GramEstimate stars={stars}/></span>;
}
