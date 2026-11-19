import { init, miniApp, viewport, backButton, hapticFeedback, invoice, swipeBehavior, retrieveLaunchParams } from '@telegram-apps/sdk';

let booted = false;
const mobilePlatforms = new Set(['ios', 'android', 'android_x']);

function launchPlatform(): string | undefined {
  const platform = window.Telegram?.WebApp?.platform;
  if (platform && platform !== 'unknown') return platform;
  try { return retrieveLaunchParams().tgWebAppPlatform; } catch { return undefined; }
}

function applySafeArea() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  const safeTop = tg.safeAreaInset?.top || 0;
  const contentTop = tg.contentSafeAreaInset?.top || 0;
  const isFs = tg.isFullscreen || (mobilePlatforms.has(tg.platform) && tg.isVersionAtLeast?.('8.0'));
  const totalTop = Math.max(safeTop + contentTop, isFs ? safeTop + 54 : safeTop);
  const style = document.documentElement.style;
  if (totalTop > 0) {
    style.setProperty('--tg-computed-top', `${totalTop}px`);
  } else style.removeProperty('--tg-computed-top');
}

export function syncTelegramTheme() {
  const graphite = document.documentElement.dataset.theme !== 'glass';
  const background = graphite ? '#111112' : '#080d1b';
  const dock = graphite ? '#181819' : '#131314';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  const tg = window.Telegram?.WebApp;
  // Older Telegram clients only accept their own theme colors.
  try { tg?.setHeaderColor?.(background); } catch {}
  try { tg?.setBackgroundColor?.(background); } catch {}
  try { tg?.setBottomBarColor?.(dock); } catch {}
}

export async function bootTelegram() {
  if (booted) return;
  booted = true;
  syncTelegramTheme();

  const platform = launchPlatform();
  const immersive = platform !== undefined && mobilePlatforms.has(platform);
  const tg = window.Telegram?.WebApp;
  if (tg) {
    try {
      tg.ready();
      if (immersive) {
        tg.expand?.();
        tg.requestFullscreen?.();
        tg.disableVerticalSwipes?.();
      } else if (tg.isFullscreen) tg.exitFullscreen?.();
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
      if (!tg && immersive) {
        viewport.expand();
        if (viewport.requestFullscreen.isAvailable()) await viewport.requestFullscreen();
      } else if (!tg && viewport.isFullscreen() && viewport.exitFullscreen.isAvailable()) {
        await viewport.exitFullscreen();
      }
    }
    if (swipeBehavior.isSupported()) {
      if (swipeBehavior.mount.isAvailable()) {
        swipeBehavior.mount();
      }
      if (immersive && swipeBehavior.disableVertical.isAvailable()) {
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

export function impactHaptic(style: 'light' | 'heavy') {
  try {
    if (hapticFeedback.isSupported()) hapticFeedback.impactOccurred(style);
    else window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  } catch {
    /* client may not support haptics */
  }
}

export function lightHaptic() {
  impactHaptic('light');
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
