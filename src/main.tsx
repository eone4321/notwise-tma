import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { MotionConfig } from 'motion/react';
import { collectionMarket, tokenMarket } from './features/marketData';
import { App } from './app/App';
import './styles.css';
import './ui/guide-game.css';
import { bootTelegram } from './telegram/client';
import { warmArt } from './ui/warmArt';

void (async () => {
  tokenMarket.refresh();
  collectionMarket.refresh();
  const bar = document.querySelector<HTMLProgressElement>('.guideLoading progress');
  const percent = document.querySelector('.guideLoadPercent');
  let choice: string | null = null;
  try { choice = localStorage.getItem('notwise.guide.language'); } catch { /* ignore */ }
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  const rawLang = (typeof tgLang === 'string' && tgLang) || navigator.language || '';
  const detected: 'en' | 'ru' = /^ru\b/i.test(rawLang) ? 'ru' : 'en';
  const initialLocale = choice === 'ru' || choice === 'en' ? choice : detected;
  document.documentElement.lang = initialLocale;
  if (initialLocale === 'en') {
    const labelNode = percent?.previousSibling;
    if (labelNode && labelNode.nodeType === Node.TEXT_NODE) labelNode.textContent = 'Loading guide ';
    if (bar) bar.setAttribute('aria-label', 'Loading images');
  }
  const prepareArt = warmArt((loaded, total) => {
    if (bar && total) {
      bar.max = total;
      bar.value = loaded;
    }
    if (percent && total) percent.textContent = Math.floor(loaded / total * 100) + '%';
  });
  const fontLoads = [
    document.fonts.load('400 16px Gilroy', 'Not Wise · Яйца и скины'),
    document.fonts.load('500 16px Gilroy', 'Not Wise · Яйца и скины'),
    document.fonts.load('600 16px Gilroy', 'Not Wise · Яйца и скины'),
    document.fonts.load('700 16px Gilroy', 'Not Wise · Яйца и скины'),
    document.fonts.load('800 16px Gilroy', 'Not Wise · Яйца и скины'),
  ];
  await Promise.all([
    prepareArt,
    Promise.allSettled(fontLoads),
    document.fonts.ready.catch(() => null),
  ]);
  void bootTelegram();
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <BrowserRouter><App/></BrowserRouter>
      </MotionConfig>
    </React.StrictMode>,
  );
})();
