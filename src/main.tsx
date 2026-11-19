import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { MotionConfig } from 'motion/react';
import { collectionMarket, tokenMarket } from './features/marketData';
import { App } from './app/App';
import './styles.css';
import { bootTelegram } from './telegram/client';
import { warmArt } from './ui/warmArt';

void (async () => {
  tokenMarket.refresh();
  collectionMarket.refresh();
  const bar = document.querySelector<HTMLProgressElement>('.guideLoading progress');
  const percent = document.querySelector('.guideLoadPercent');
  const prepareArt = warmArt((loaded, total) => {
    if (bar && total) {
      bar.max = total;
      bar.value = loaded;
    }
    if (percent && total) percent.textContent = Math.floor(loaded / total * 100) + '%';
  });
  await Promise.all([
    prepareArt,
    document.fonts.load('500 16px Gilroy', 'Not Wise · Яйца и скины').catch(() => []),
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
