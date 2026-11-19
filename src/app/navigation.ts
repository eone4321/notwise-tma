import { useLayoutEffect } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router';

const positions = new Map<string, number>();

export function useGuideScroll() {
  const { key, hash, pathname, state } = useLocation();
  const navigationType = useNavigationType();
  const address = pathname + hash;
  const restore = state?.restoreGuideScroll || navigationType === 'POP';

  useLayoutEffect(() => {
    const previousPosition = restore ? positions.get(address) : undefined;
    let pending = previousPosition;
    let observer: ResizeObserver | undefined;
    let frame = 0;

    function save() {
      if (pending === undefined && document.body.style.position !== 'fixed') {
        positions.set(address, window.scrollY);
      }
    }
    function finish() {
      pending = undefined;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      save();
    }
    function apply() {
      if (pending === undefined || document.body.style.position === 'fixed') return;
      window.scrollTo({ top: pending, behavior: 'instant' });
      if (Math.abs(window.scrollY - pending) <= 1) finish();
    }
    if (previousPosition !== undefined) {
      apply();
      if (pending !== undefined) {
        observer = new ResizeObserver(apply);
        const shell = document.querySelector('.shell');
        if (shell) observer.observe(shell);
        frame = requestAnimationFrame(apply);
      }
    } else {
      const anchor = hash && document.getElementById(hash.slice(1));
      if (anchor) anchor.scrollIntoView();
      else window.scrollTo({ top: 0, behavior: 'instant' });
      save();
    }

    const interrupt = () => {
      if (pending !== undefined) finish();
      else save();
    };
    window.addEventListener('scroll', save, { passive: true });
    document.addEventListener('pointerdown', interrupt, true);
    document.addEventListener('wheel', interrupt, { passive: true, capture: true });
    document.addEventListener('click', interrupt, true);
    const browserSetting = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', save);
      document.removeEventListener('pointerdown', interrupt, true);
      document.removeEventListener('wheel', interrupt, true);
      document.removeEventListener('click', interrupt, true);
      history.scrollRestoration = browserSetting;
    };
  }, [address, hash, key, restore]);
}

export function useGuideNavigation() {
  const { pathname, hash, state } = useLocation();
  const navigate = useNavigate();
  const sections = pathname.split('/').filter(Boolean);
  const skipGrouping = (sections[0] === 'collections' && sections[1] === 'albums') ||
    (sections[0] === 'combat' && sections[1] === 'skills' && sections.length === 3);
  const isEgg = sections[0] === 'owl' && ['mystery','red','season','green','gold'].includes(sections[1]);
  const returnTo = state?.returnTo;
  const fromEgg = pathname.startsWith('/assets/item/') || pathname === '/owl/skins';
  const fromAlbum = pathname === '/secrets' && /^#sticker-\d+$/.test(hash) &&
    typeof returnTo === 'string' && /^\/collections\/albums\/(?:[1-9]|1\d|20)$/.test(returnTo);
  const hasReturn = typeof returnTo === 'string' && (
    fromAlbum ||
    (pathname === '/ecosystem' && hash.startsWith('#token-') && returnTo === '/') ||
    (fromEgg && /^\/owl\/(mystery|red|season|green|gold)$/.test(returnTo)) ||
    (isEgg && ['/owl', '/owl/loot', '/owl/shop'].includes(returnTo))
  );
  const parent = hasReturn ? returnTo : hash ? pathname : isEgg ? '/owl' : sections.length > 1
    ? '/' + sections.slice(0, skipGrouping ? 1 : -1).join('/')
    : '/';

  return {
    back: () => {
      if (parent === pathname && !hash) return;
      positions.set(pathname + hash, window.scrollY);
      navigate(parent, { replace: true, state: {
        restoreGuideScroll: true,
        ...(fromAlbum && { stickerId: Number(hash.slice('#sticker-'.length)) }),
      } });
    },
    home: () => {
      positions.set(pathname + hash, window.scrollY);
      navigate('/', { replace: true });
    },
  };
}
