import { DetailLink } from '../ui/DetailLink';
import { useModal } from '../ui/useModal';
import { artSrc } from '../ui/warmArt';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import tokens from '../../public/data/tokens.json';
import { tokenMarket, type TokenQuote } from './marketData';

const usd = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
});

const notUsd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const compactUsd = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });
const smallUsd = new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 3 });

function formatQuote(symbol: string, price: number) {
  if (symbol === 'NOT') return (price < 0.00005 ? '<0.0001' : notUsd.format(price)) + ' $';
  return price < 0.01 ? smallUsd.format(price) + ' $' : usd.format(price);
}

function tokenIcon(symbol: string) {
  return `/brand/tokens/${symbol === 'GRAM' ? 'gram.png' : `${symbol.toLowerCase()}.webp`}`;
}

export function tokenCapitalization(quote?: TokenQuote) {
  if (quote?.marketCapUsd) return { label: 'Кап.', value: compactUsd.format(quote.marketCapUsd) + ' $' };
  if (quote?.fdvUsd) return { label: 'FDV', value: compactUsd.format(quote.fdvUsd) + ' $' };
  return { label: 'Кап.', value: '—' };
}

function useQuotes() {
  const { data, pending, stale } = tokenMarket.useSnapshot();
  const rows = data?.items ?? [];
  const usable = tokens.tokens.flatMap(({ symbol }) => {
    const row = rows.find(quote => quote.symbol === symbol);
    const price = Number(row?.priceUsd);
    return row && Number.isFinite(price) && price > 0 ? [{ ...row, displayPrice: formatQuote(symbol, price) }] : [];
  });
  return { rows, usable, pending, stale, reload: () => tokenMarket.refresh(true) };
}

function QuoteList({ quotes }: { quotes: ReturnType<typeof useQuotes> }) {
  const { rows, usable, pending, stale, reload } = quotes;
  const updated = usable.find(row => row.fetchedAt)?.fetchedAt;
  return <>
    <ul className="tokenRatesList" aria-busy={pending}>
      {tokens.tokens.map(({ symbol, name }) => {
        const price = usable.find(row => row.symbol === symbol)?.displayPrice ?? '—';
        const cap = tokenCapitalization(rows.find(row => row.symbol === symbol));
        return <li key={symbol}>
          <DetailLink className="tokenRateLink" to={`/ecosystem/tokens#token-${symbol}`}
            aria-label={`${symbol}, ${price}. ${cap.label} ${cap.value}. Открыть токен`}>
            <img src={artSrc(tokenIcon(symbol))} alt="" width="30" height="30"/>
            <span className="tokenRateName"><b>{symbol}</b><small>{name}</small></span>
            <span className="quoteNumbers"><strong>{price}</strong><small>{cap.label} {cap.value}</small></span>
            <span className="rowChevron" aria-hidden="true"/>
          </DetailLink>
        </li>;
      })}
    </ul>
    <p className="caption" role="status">
      {pending && !usable.length ? 'Загружаем котировки…' : !usable.length ? 'Котировки временно недоступны.' : <>
        {stale || usable.some(row => row.status === 'stale') ? 'Последние сохранённые данные' : 'Обновлено'}
        {updated && <> · <time dateTime={updated}>{new Date(updated).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></>}
      </>}
    </p>
    {rows.some(row => row.fdvUsd && !row.marketCapUsd) && <p className="caption fdvNote">FDV — оценка всей эмиссии. Капитализация учитывает токены в обращении.</p>}
    <button className="refreshBtn" onClick={reload} disabled={pending}>Обновить курсы</button>
  </>;
}

export function TokenQuotes() {
  const quotes = useQuotes();
  return <section className="card" aria-labelledby="token-rates">
    <h2 id="token-rates">Курсы токенов</h2>
    <QuoteList quotes={quotes}/>
  </section>;
}

let lastTickerIndex = 0;

export function TokenTicker() {
  const quotes = useQuotes();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(lastTickerIndex);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [opened, setOpened] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const { usable } = quotes;
  useModal(dialog, opened);

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
    <button className="tokenTicker" type="button" aria-label="Курсы токенов" aria-haspopup="dialog"
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
    <dialog className="modal tokenRatesDialog" ref={dialog} aria-labelledby="ticker-rates-title"
      onCancel={event => { event.preventDefault(); setOpened(false); }} onClick={event => {
        if (event.target === event.currentTarget) setOpened(false);
      }}>
      <div className="tokenRatesDialogBody">
        <div className="tokenRatesDialogHeader">
          <h2 id="ticker-rates-title" data-dialog-title tabIndex={-1}>Курсы токенов</h2>
          <button className="close" type="button" aria-label="Закрыть курсы" onClick={() => setOpened(false)}>×</button>
        </div>
        <QuoteList quotes={quotes}/>
      </div>
    </dialog>
  </>;
}
