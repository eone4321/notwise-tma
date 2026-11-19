import { useLayoutEffect } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router';

const positions = new Map<string, number>();

export function useGuideScroll() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { hash, pathname, state } = location;
  const address = pathname + hash;
  const restore = state?.restoreGuideScroll || (navigationType === 'POP' && positions.has(address));

  useLayoutEffect(() => {
    const save = () => { if (document.body.style.position !== 'fixed') positions.set(address, window.scrollY); };
    const anchor = hash ? document.getElementById(hash.slice(1)) : null;
    const previousPosition = positions.get(address);
    if (restore && previousPosition !== undefined) window.scrollTo(0, previousPosition);
    else if (anchor) anchor.scrollIntoView();
    else window.scrollTo(0, 0);
    save();

    window.addEventListener('scroll', save, { passive: true });
    document.addEventListener('click', save, true);
    const browserSetting = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => {
      window.removeEventListener('scroll', save);
      document.removeEventListener('click', save, true);
      history.scrollRestoration = browserSetting;
    };
  }, [address, hash, location.key, restore]);
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
  const hasReturn = typeof returnTo === 'string' && (
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
      navigate(parent, { replace: true, state: { restoreGuideScroll: true } });
    },
    home: () => {
      positions.set(pathname + hash, window.scrollY);
      navigate('/', { replace: true });
    },
  };
}
