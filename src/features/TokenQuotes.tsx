import { BottomDrawer } from '../ui/BottomDrawer';
import { DetailLink } from '../ui/DetailLink';
import { artSrc } from '../ui/warmArt';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import tokens from '../../public/data/tokens.json';
import { tokenMarket, type TokenQuote } from './marketData';
import { useGuideLocale } from './guideLocale';

const usdRu = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
});
const usdEn = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
});

const notUsdRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });
const notUsdEn = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 4,
});
const compactUsdRu = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });
const compactUsdEn = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
});
const smallUsdRu = new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 3 });
const smallUsdEn = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumSignificantDigits: 3,
});

function formatQuote(symbol: string, price: number, en: boolean) {
  if (symbol === 'NOT') {
    if (price < 0.00005) return en ? '<$0.0001' : '<0,0001 $';
    return en ? notUsdEn.format(price) : `${notUsdRu.format(price)} $`;
  }
  if (price < 0.01) {
    return en ? smallUsdEn.format(price) : `${smallUsdRu.format(price)} $`;
  }
  return en ? usdEn.format(price) : usdRu.format(price);
}

function tokenIcon(symbol: string) {
  return `/brand/tokens/${symbol === 'GRAM' ? 'gram.png' : `${symbol.toLowerCase()}.webp`}`;
}

export function tokenCapitalization(quote?: TokenQuote, en = false) {
  const formatCap = (value: number) => en ? compactUsdEn.format(value) : `${compactUsdRu.format(value)} $`;
  const capLabel = en ? 'MCap' : 'Кап.';
  if (quote?.marketCapUsd) return { label: capLabel, value: formatCap(quote.marketCapUsd) };
  if (quote?.fdvUsd) return { label: 'FDV', value: formatCap(quote.fdvUsd) };
  return { label: capLabel, value: '—' };
}

function useQuotes(en: boolean) {
  const { data, pending, stale } = tokenMarket.useSnapshot();
  const rows = data?.items ?? [];
  const usable = tokens.tokens.flatMap(({ symbol }) => {
    const row = rows.find(quote => quote.symbol === symbol);
    const price = Number(row?.priceUsd);
    return row && Number.isFinite(price) && price > 0 ? [{ ...row, displayPrice: formatQuote(symbol, price, en) }] : [];
  });
  return { rows, usable, pending, stale, reload: () => tokenMarket.refresh(true) };
}

function QuoteList({ quotes, en }: { quotes: ReturnType<typeof useQuotes>; en: boolean }) {
  const { rows, usable, pending, stale, reload } = quotes;
  const rawUpdated = usable.find(row => row.fetchedAt)?.fetchedAt;
  const hasValidDate = typeof rawUpdated === 'string' && Number.isFinite(Date.parse(rawUpdated));
  const updated = hasValidDate ? rawUpdated : null;
  const isStale = stale || usable.some(row => row.status === 'stale');
  const showStatus = (pending && !usable.length) || !usable.length || isStale || hasValidDate;
  return <>
    <ul className="tokenRatesList" aria-busy={pending}>
      {tokens.tokens.map(({ symbol, name }) => {
        const price = usable.find(row => row.symbol === symbol)?.displayPrice ?? '—';
        const cap = tokenCapitalization(rows.find(row => row.symbol === symbol), en);
        return <li key={symbol}>
          <DetailLink className="tokenRateLink" to={`/ecosystem/tokens#token-${symbol}`}
            aria-label={en
              ? `${symbol}, ${price}. ${cap.label} ${cap.value}. Open token`
              : `${symbol}, ${price}. ${cap.label} ${cap.value}. Открыть токен`}>
            <img src={artSrc(tokenIcon(symbol))} alt="" width="30" height="30"/>
            <span className="tokenRateName"><b>{symbol}</b><small>{name}</small></span>
            <span className="quoteNumbers"><strong>{price}</strong><small>{cap.label} {cap.value}</small></span>
            <span className="rowChevron" aria-hidden="true"/>
          </DetailLink>
        </li>;
      })}
    </ul>
    {showStatus && <p className="caption" role="status">
      {pending && !usable.length
        ? (en ? 'Loading rates…' : 'Загружаем котировки…')
        : !usable.length
          ? (en ? 'Rates are temporarily unavailable.' : 'Котировки временно недоступны.')
          : <>
            {isStale
              ? (en ? 'Last saved rates' : 'Последние сохранённые данные')
              : (en ? 'Updated' : 'Обновлено')}
            {updated && <> · <time dateTime={updated}>{new Date(updated).toLocaleString(en ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></>}
          </>}
    </p>}
    {rows.some(row => row.fdvUsd && !row.marketCapUsd) && <p className="caption fdvNote">{en ? 'FDV values the total supply. Market cap counts circulating tokens.' : 'FDV — оценка всей эмиссии. Капитализация учитывает токены в обращении.'}</p>}
    <button className="refreshBtn" onClick={reload} disabled={pending}>{en ? 'Refresh rates' : 'Обновить курсы'}</button>
  </>;
}

export function TokenQuotes() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const quotes = useQuotes(en);
  return <section className="card" aria-labelledby="token-rates">
    <h2 id="token-rates">{en ? 'Token rates' : 'Курсы токенов'}</h2>
    <QuoteList quotes={quotes} en={en}/>
  </section>;
}

let lastTickerIndex = 0;

export function TokenTicker() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const quotes = useQuotes(en);
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(lastTickerIndex);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [opened, setOpened] = useState(false);
  const { usable } = quotes;

  useEffect(() => {
    if (reducedMotion || hovered || focused || opened || usable.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      lastTickerIndex = (lastTickerIndex + 1) % usable.length;
      setIndex(lastTickerIndex);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [reducedMotion, hovered, focused, opened, usable.length]);

  const quote = usable.length ? usable[index % usable.length] : undefined;
  return <>
    <button className="tokenTicker" type="button" aria-label={en ? 'Token rates' : 'Курсы токенов'} aria-haspopup="dialog"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onClick={() => setOpened(true)}>
      <span className="tokenTickerTrack" aria-hidden="true">
        {quote ? <AnimatePresence initial={false}>
          <motion.span className="tokenTickerValue" key={quote.symbol}
            initial={{ y: 12, opacity: 0, filter: "blur(3px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }} exit={{ y: -12, opacity: 0, filter: "blur(3px)" }}
            transition={{ duration: reducedMotion ? 0 : 0.45, ease: 'easeInOut' }}>
            <b>{quote.symbol}</b><span className="tickerPrice">{quote.displayPrice}</span>
            <img src={artSrc(tokenIcon(quote.symbol))} alt="" width="20" height="20"/>
          </motion.span>
        </AnimatePresence> : <span className="tokenTickerEmpty">USD</span>}
      </span>
    </button>
    {opened && (
      <BottomDrawer
        title={en ? 'Token rates' : 'Курсы токенов'}
        closeLabel={en ? 'Close rates' : 'Закрыть курсы'}
        onClose={() => setOpened(false)}
      >
        <div className="buildPickerOptions">
          <QuoteList quotes={quotes} en={en}/>
        </div>
      </BottomDrawer>
    )}
  </>;
}
