import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import tokens from '../../public/data/tokens.json';

type Quote = {
  symbol: string;
  priceUsd: string | null;
  fetchedAt: string | null;
  status: 'fresh' | 'stale' | 'unavailable';
};
const usd = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
});

const smallUsd = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'USD', maximumSignificantDigits: 2,
});

function tokenIcon(symbol: string) {
  return `/brand/tokens/${symbol === 'GRAM' ? 'gram.png' : `${symbol.toLowerCase()}.webp`}`;
}

function useQuotes() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [pending, setPending] = useState(true);
  const [request, setRequest] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        let items: Quote[] = [];
        try {
          const response = await fetch('/api/market/tokens', { signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.items)) items = data.items;
          }
        } catch {
          /* fallback to TonAPI directly */
        }

        if (items.length === 0) {
          const addressList = 'ton,EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT,EQAu7qxfVgMg0tpnosBpARYOG--W1EUuX_5H_vOQtTVuHnrn,EQB2Vubu0fyGCvhUM88kxfMVFJ8Nr9QuqH40mG4sKbhg_TNT,EQA-uwAf8ED_aJGX2BJve4_EaquHgFiQyUKopQjucLyY_PEW';
          const r = await fetch(`https://tonapi.io/v2/rates?tokens=${addressList}&currencies=usd`, { signal: controller.signal });
          if (r.ok) {
            const d = await r.json();
            const rates = d?.rates || {};
            const map: Record<string, string> = {
              GRAM: 'TON',
              NOT: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
              GRC: 'EQAu7qxfVgMg0tpnosBpARYOG--W1EUuX_5H_vOQtTVuHnrn',
              TNT: 'EQB2Vubu0fyGCvhUM88kxfMVFJ8Nr9QuqH40mG4sKbhg_TNT',
              PEW: 'EQA-uwAf8ED_aJGX2BJve4_EaquHgFiQyUKopQjucLyY_PEW',
            };
            items = Object.entries(map).map(([symbol, addr]) => {
              const price = rates[addr]?.prices?.USD;
              return {
                symbol,
                priceUsd: typeof price === 'number' && price > 0 ? String(price) : null,
                fetchedAt: new Date().toISOString(),
                status: price ? 'fresh' : 'unavailable',
              };
            });
          }
        }
        setRows(items);
      } catch {
        if (!controller.signal.aborted) setRows([]);
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [request]);

  const usable = tokens.tokens.flatMap(({ symbol }) => {
    const row = rows.find(quote => quote.symbol === symbol);
    const price = Number(row?.priceUsd);
    return row && Number.isFinite(price) && price > 0 ? [{ ...row, displayPrice: (price < 1 ? smallUsd : usd).format(price) }] : [];
  });
  function reload() {
    setPending(true);
    setRequest(value => value + 1);
  }
  return { usable, pending, reload };
}

function QuoteList({ quotes }: { quotes: ReturnType<typeof useQuotes> }) {
  const { usable, pending, reload } = quotes;
  const updated = usable.find(row => row.fetchedAt)?.fetchedAt;
  return <>
    <ul className="tokenRatesList" aria-busy={pending}>
      {tokens.tokens.map(({ symbol, name }) => (
        <li key={symbol}>
          <img src={tokenIcon(symbol)} alt="" width="30" height="30"/>
          <div className="tokenRateName"><b>{symbol}</b><small>{name}</small></div>
          <strong>{usable.find(row => row.symbol === symbol)?.displayPrice ?? '—'}</strong>
        </li>
      ))}
    </ul>
    <p className="caption" role="status">
      {pending ? 'Загружаем котировки…' : !usable.length ? 'Котировки временно недоступны.' : <>
        {usable.some(row => row.status === 'stale') ? 'Последние сохранённые данные' : 'Обновлено'}
        {updated && <> · <time dateTime={updated}>{new Date(updated).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></>}
      </>}
    </p>
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

export function TokenTicker() {
  const quotes = useQuotes();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [opened, setOpened] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const { usable, reload } = quotes;

  useEffect(() => {
    if (reducedMotion || hovered || focused || opened || usable.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex(value => (value + 1) % usable.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [reducedMotion, hovered, focused, opened, usable.length]);

  const quote = usable.length ? usable[index % usable.length] : undefined;
  function showRates() {
    dialog.current?.showModal();
    setOpened(true);
    reload();
  }

  return <>
    <button className="tokenTicker" type="button" aria-label="Курсы токенов" aria-haspopup="dialog"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onClick={showRates}>
      <span className="tokenTickerLabel">Курсы</span>
      <span className="tokenTickerTrack" aria-hidden="true">
        {quote ? <AnimatePresence initial={false}>
          <motion.span className="tokenTickerValue" key={quote.symbol}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.45, ease: 'easeInOut' }}>
            <img src={tokenIcon(quote.symbol)} alt="" width="18" height="18"/>
            <b>{quote.symbol}</b><span className="tickerPrice">{quote.displayPrice}</span>
          </motion.span>
        </AnimatePresence> : <span className="tokenTickerValue">USD</span>}
      </span>
    </button>
    <dialog className="modal tokenRatesDialog" ref={dialog} aria-labelledby="ticker-rates-title"
      onClose={() => setOpened(false)} onClick={event => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}>
      <div className="tokenRatesDialogBody">
        <div className="tokenRatesDialogHeader">
          <h2 id="ticker-rates-title">Курсы токенов</h2>
          <button className="close" type="button" aria-label="Закрыть курсы" onClick={() => dialog.current?.close()}>×</button>
        </div>
        <QuoteList quotes={quotes}/>
      </div>
    </dialog>
  </>;
}
