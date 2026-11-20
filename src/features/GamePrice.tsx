import type { ReactNode } from 'react';
import { estimateGramForStars } from '../domain/purchase-prices';
import { useGuideLocale } from './guideLocale';
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
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  return <span className="rateEstimate" title={stale ? (en ? 'Using cached GRAM rate' : 'По сохранённому курсу GRAM') : (en ? 'Using current GRAM quote' : 'По текущей котировке GRAM')} data-stale={stale || undefined}>
    {stale && <span className="sr-only">{en ? 'Using cached rate. ' : 'По сохранённому курсу. '}</span>}{children}
  </span>;
}

export function GramEstimate({ stars, showUnavailable, purpose }: { stars: number; showUnavailable?: boolean; purpose?: 'game' | 'support' }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const { usd, pending, stale } = useGramRate();
  const value = usd === null ? null : estimateGramForStars(stars, usd, purpose);
  if (value === null) return showUnavailable ? <span className="gramUnavailable"
    aria-label={pending ? (en ? 'Loading GRAM rate' : 'Курс GRAM загружается') : (en ? 'GRAM rate unavailable' : 'Курс GRAM недоступен')}>—</span> : null;
  return <RateEstimate stale={stale}><Price value={value} currency="gram" approximate/></RateEstimate>;
}

export function StarsAndGram({ stars }: { stars: number }) {
  return <span className="starsAndGram"><Price value={stars} currency="stars"/><GramEstimate stars={stars}/></span>;
}
