import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { MotionConfig } from 'motion/react';
import { App } from './app/App';
import './styles.css';
import { bootTelegram } from './telegram/client';
import { warmArt } from './ui/warmArt';

void (async () => {
  const bar = document.querySelector<HTMLProgressElement>('.guideLoading progress');
  const percent = document.querySelector('.guideLoadPercent');
  await warmArt((loaded, total) => {
    if (bar && total) {
      bar.max = total;
      bar.value = loaded;
    }
    if (percent && total) percent.textContent = Math.floor(loaded / total * 100) + '%';
  });
  void bootTelegram();
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <BrowserRouter><App/></BrowserRouter>
      </MotionConfig>
    </React.StrictMode>,
  );
})();
