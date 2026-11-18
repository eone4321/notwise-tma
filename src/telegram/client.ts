import { init, miniApp, viewport, backButton, hapticFeedback, invoice } from '@telegram-apps/sdk';

let booted = false;

export async function bootTelegram() {
  if (booted) return;
  booted = true;

  // 1. Native Telegram WebApp SDK (direct expand + fullscreen)
  const tg = window.Telegram?.WebApp;
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
      }
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
    if (backButton.isSupported()) backButton.mount();
    if (miniApp.ready.isAvailable()) miniApp.ready();
  } catch {
    /* fallback already handled */
  }
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
