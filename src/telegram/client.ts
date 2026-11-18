import { init, miniApp, viewport, backButton, hapticFeedback, invoice } from '@telegram-apps/sdk';
let booted = false;
export async function bootTelegram() {
  if (booted || !window.Telegram?.WebApp?.initData) return;
  booted = true;
  try {
    init(); await viewport.mount(); viewport.bindCssVars();
    if (backButton.isSupported()) backButton.mount();
    miniApp.ready(); viewport.expand();
  } catch { window.Telegram.WebApp.ready(); }
}
export function lightHaptic() {
  try { if (hapticFeedback.isSupported()) hapticFeedback.impactOccurred('light'); else window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch { /* client may not support haptics */ }
}
export function telegramPopup() {
  const webApp = window.Telegram?.WebApp;
  return webApp?.initData ? webApp : undefined;
}
export async function openTelegramInvoice(url: string) {
  if (invoice.isSupported()) return invoice.open(url, 'url');
  const tg = window.Telegram?.WebApp;
  if (tg?.openInvoice) return new Promise<string>((resolve) => tg.openInvoice(url, resolve));
  window.open(url, '_blank', 'noopener,noreferrer');
  return 'opened';
}
declare global { interface Window { Telegram?: { WebApp: any } } }
