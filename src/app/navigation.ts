import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

type View = { scroll: number; open: string[] };
const views = new Map<string, View>();
const viewKey = 'notwise.guide.views.v1';

function readView(address: string) {
  try {
    if (!views.has(address)) {
      const value: unknown = JSON.parse(sessionStorage.getItem(viewKey + address) ?? 'null');
      if (value && typeof value === 'object' && 'scroll' in value && typeof value.scroll === 'number' &&
          Number.isFinite(value.scroll) && 'open' in value && Array.isArray(value.open)) {
        views.set(address, { scroll: Math.max(0, value.scroll), open: value.open.filter(key => typeof key === 'string') });
      }
    }
  } catch { /* The in-memory view works when browser storage is disabled. */ }
  return views.get(address);
}

export function useGuideScroll() {
  const { key, hash, pathname } = useLocation();
  const address = pathname + hash;

  useLayoutEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const saved = readView(address);
    main.dataset.restored = String(Boolean(saved));
    const disclosures = () => Array.from(main.querySelectorAll('details'));
    const detailKey = (details: HTMLDetailsElement, index: number) => details.id || String(index);
    const anchor = hash && document.getElementById(hash.slice(1));
    let pending = saved?.scroll;
    let observer: ResizeObserver | undefined;

    if (saved) {
      for (const [index, details] of disclosures().entries()) {
        details.removeAttribute('data-user-open');
        details.open = details === anchor || saved.open.includes(detailKey(details, index));
      }
    }
    if (anchor) {
      for (let parent = anchor.parentElement; parent && parent !== main; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
      }
    }

    const freezeView = (scroll = window.scrollY) => {
      if (document.body.style.position === 'fixed') scroll = views.get(address)?.scroll ?? pending ?? scroll;
      return { scroll, open: disclosures().flatMap((details, i) => details.open ? [detailKey(details, i)] : []) };
    };
    const save = () => {
      if (pending === undefined) views.set(address, freezeView());
    };
    const persist = () => {
      save();
      const view = views.get(address);
      if (!view) return;
      try { sessionStorage.setItem(viewKey + address, JSON.stringify(view)); } catch { /* Optional. */ }
    };
    const restore = () => {
      if (pending === undefined || document.body.style.position === 'fixed') return;
      window.scrollTo({ top: pending, behavior: 'instant' });
      if (Math.abs(window.scrollY - pending) <= 2) {
        pending = undefined;
        observer?.disconnect();
      }
    };

    if (pending !== undefined) {
      restore();
      if (pending !== undefined) {
        observer = new ResizeObserver(restore);
        observer.observe(main);
      }
    } else if (anchor) {
      anchor.scrollIntoView({ block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    save();

    function interrupt() {
      pending = undefined;
      observer?.disconnect();
      persist();
    }

    const browserSetting = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('pagehide', persist);
    window.addEventListener('popstate', persist);
    const markDisclosure = (event: Event) => {
      if (!(event.target instanceof Element) || event.target.closest('a, button, input')) return;
      const details = event.target.closest('summary')?.parentElement;
      if (details instanceof HTMLDetailsElement) details.toggleAttribute('data-user-open', !details.open);
    };
    document.addEventListener('click', persist, true);
    main.addEventListener('click', markDisclosure);
    document.addEventListener('pointerdown', interrupt, true);
    document.addEventListener('touchstart', interrupt, { capture: true, passive: true });
    document.addEventListener('wheel', interrupt, { capture: true, passive: true });
    main.addEventListener('toggle', save, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', save);
      window.removeEventListener('pagehide', persist);
      window.removeEventListener('popstate', persist);
      document.removeEventListener('click', persist, true);
      document.removeEventListener('pointerdown', interrupt, true);
      document.removeEventListener('touchstart', interrupt, true);
      document.removeEventListener('wheel', interrupt, true);
      main.removeEventListener('toggle', save, true);
      main.removeEventListener('click', markDisclosure);
      history.scrollRestoration = browserSetting;
    };
  }, [address, hash, key]);
}

const rootTabs = new Set([
  '/owl/shop', '/owl/loot', '/owl/skins', '/combat/stats', '/combat/builds', '/ecosystem/quotes',
  '/ecosystem/tokens', '/collections/market', '/support/settings', '/support/achievements', '/secrets/achievements',
]);

export function parentPath(path: string) {
  if (rootTabs.has(path)) return '/';
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'collections' && parts[1] === 'albums') return '/collections';
  if (parts[0] === 'combat' && parts[1] === 'skills' && parts.length === 3) return '/combat';
  if (parts[0] === 'assets' && parts[1] === 'item') return '/assets';
  return parts.length > 1 ? '/' + parts.slice(0, -1).join('/') : '/';
}

export function useGuideNavigation() {
  const { pathname, hash, state } = useLocation();
  const navigate = useNavigate();
  return {
    back: () => {
      if (state?.guideDetail === true && history.state?.idx > 0) {
        navigate(-1);
        return;
      }
      const parent = parentPath(pathname);
      if (parent !== pathname || hash) navigate(parent, { replace: true });
    },
    home: () => navigate('/', { replace: true }),
  };
}
