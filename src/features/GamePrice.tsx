import type { ReactNode } from 'react';
import { estimateGramForStars } from '../domain/purchase-prices';
import { tokenMarket } from './marketData';
import { Price } from './Price';

const dollars = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const smallDollars = new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 2 });

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

export function GramEstimate({ stars, showUnavailable }: { stars: number; showUnavailable?: boolean }) {
  const { usd, pending, stale } = useGramRate();
  const value = usd === null ? null : estimateGramForStars(stars, usd);
  if (value === null) return showUnavailable ? <span className="gramUnavailable"
    aria-label={pending ? 'Курс GRAM загружается' : 'Курс GRAM недоступен'}>—</span> : null;
  return <RateEstimate stale={stale}><Price value={value} currency="gram" approximate/></RateEstimate>;
}

export function StarsAndGram({ stars }: { stars: number }) {
  return <span className="starsAndGram"><Price value={stars} currency="stars"/><GramEstimate stars={stars}/></span>;
}

export function MintUsdEstimate({ gram }: { gram: number }) {
  const { usd, stale } = useGramRate();
  if (usd === null) return null;
  const value = gram * usd;
  if (!Number.isFinite(value) || value < 0) return null;
  return <RateEstimate stale={stale}>
    <span className="nativeUsdEstimate">≈ {value > 0 && value < .01 ? smallDollars.format(value) + ' $' : dollars.format(value)}</span>
  </RateEstimate>;
}
