import { useLocation, useNavigate } from 'react-router';

export function useGuideNavigation() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const sections = pathname.split('/').filter(Boolean);
  const parent = hash ? pathname : sections.length > 1
    ? '/' + sections.slice(0, sections[1] === 'albums' || (sections[1] === 'skills' && sections.length === 3) ? 1 : -1).join('/')
    : '/';
  return {
    back: () => {
      if (parent !== pathname || hash) navigate(parent, { replace: true });
    },
    home: () => navigate('/', { replace: true }),
  };
}
