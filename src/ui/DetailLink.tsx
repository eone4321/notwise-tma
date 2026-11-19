import { Link, type LinkProps } from 'react-router';

/** A push from a guide surface to a detail that should return to that surface. */
export function DetailLink(props: Omit<LinkProps, 'replace' | 'state'>) {
  return <Link {...props} state={{ guideDetail: true }}/>;
}
