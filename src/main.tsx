import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { MotionConfig } from 'motion/react';
import { App } from './app/App';
import './styles.css';
import { bootTelegram } from './telegram/client';
import { warmArt } from './ui/warmArt';

void (async () => {
  await warmArt();
  void bootTelegram();
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <BrowserRouter><App/></BrowserRouter>
      </MotionConfig>
    </React.StrictMode>,
  );
})();
