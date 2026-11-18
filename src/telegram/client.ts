import { init, miniApp, viewport, backButton, hapticFeedback, invoice, swipeBehavior } from '@telegram-apps/sdk';

let booted = false;

function applySafeArea() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  const safeTop = tg.safeAreaInset?.top || 0;
  const contentTop = tg.contentSafeAreaInset?.top || 0;
  // When in fullscreen or expanded mode on modern Telegram, floating controls need clearance
  const isFs = tg.isFullscreen || (typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('8.0'));
  const totalTop = Math.max(safeTop + contentTop, isFs ? safeTop + 54 : safeTop);
  if (totalTop > 0) {
    document.documentElement.style.setProperty('--tg-computed-top', `${totalTop}px`);
  }
}

export async function bootTelegram() {
  if (booted) return;
  booted = true;

  // 1. Native Telegram WebApp SDK (direct expand + fullscreen + safe area tracking + disable pull-to-close)
  const tg = window.Telegram?.WebApp;
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
      }
      if (typeof tg.disableVerticalSwipes === 'function') {
        tg.disableVerticalSwipes();
      }
      applySafeArea();
      tg.onEvent?.('safeAreaChanged', applySafeArea);
      tg.onEvent?.('contentSafeAreaChanged', applySafeArea);
      tg.onEvent?.('fullscreenChanged', applySafeArea);
      tg.onEvent?.('viewportChanged', applySafeArea);
    } catch {
      /* ignore */
    }
  }

  // 2. @telegram-apps/sdk
  try {
    init();
    if (viewport.mount.isAvailable()) {
      await viewport.mount();
      viewport.bindCssVars();
      viewport.expand();
      if (viewport.requestFullscreen.isAvailable()) {
        await viewport.requestFullscreen();
      }
    }
    if (swipeBehavior.isSupported()) {
      if (swipeBehavior.mount.isAvailable()) {
        swipeBehavior.mount();
      }
      if (swipeBehavior.disableVertical.isAvailable()) {
        swipeBehavior.disableVertical();
      }
    }
    if (backButton.isSupported()) backButton.mount();
    if (miniApp.ready.isAvailable()) miniApp.ready();
  } catch {
    /* fallback already handled */
  }

  // Re-check safe area after mounting
  setTimeout(applySafeArea, 100);
  setTimeout(applySafeArea, 500);
}

export function lightHaptic() {
  try {
    if (hapticFeedback.isSupported()) hapticFeedback.impactOccurred('light');
    else window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  } catch {
    /* client may not support haptics */
  }
}

export function telegramPopup() {
  const webApp = window.Telegram?.WebApp;
  return webApp;
}

export async function openTelegramInvoice(url: string) {
  if (invoice.isSupported()) return invoice.open(url, 'url');
  const tg = window.Telegram?.WebApp;
  if (tg?.openInvoice) return new Promise<string>((resolve) => tg.openInvoice(url, resolve));
  window.open(url, '_blank', 'noopener,noreferrer');
  return 'opened';
}

declare global {
  interface Window {
    Telegram?: { WebApp: any };
  }
}
