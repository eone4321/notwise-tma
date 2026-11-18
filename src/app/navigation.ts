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
    const save = () => positions.set(address, window.scrollY);
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
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const sections = pathname.split('/').filter(Boolean);
  const skipGrouping = (sections[0] === 'collections' && sections[1] === 'albums') ||
    (sections[0] === 'combat' && sections[1] === 'skills' && sections.length === 3);
  const parent = hash ? pathname : sections.length > 1
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
