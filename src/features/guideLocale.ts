import { useEffect, useSyncExternalStore } from 'react';
import { telegramPopup } from '../telegram/client';

export type LocaleChoice = 'auto' | 'ru' | 'en';
const key = 'notwise.guide.language';
const event = 'guide-language-change';
const getChoice = (): LocaleChoice => {
  const value = localStorage.getItem(key);
  return value === 'ru' || value === 'en' ? value : 'auto';
};
function subscribe(change: () => void) {
  window.addEventListener(event, change);
  return () => window.removeEventListener(event, change);
}

export function useGuideLocale(preferred?: string) {
  const choice = useSyncExternalStore(subscribe, getChoice);
  const language = preferred || telegramPopup()?.initDataUnsafe?.user?.language_code || navigator.language;
  const detected: 'en' | 'ru' = /^ru\b/i.test(language) ? 'ru' : 'en';
  const locale = choice === 'auto' ? detected : choice;
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return { locale, choice, detected, setChoice(value: LocaleChoice) {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event(event));
  } };
}
