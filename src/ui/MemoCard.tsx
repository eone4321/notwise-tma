import type { ReactNode } from 'react';
import { DetailLink } from './DetailLink';

export type MemoLink = {
  to: string;
  label: string;
};

export function MemoChipLinks({ links }: { links: readonly MemoLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="itemValueLinks">
      {links.map(link => (
        <DetailLink key={`${link.to}:${link.label}`} className="itemValueChipLink" to={link.to}>
          <span>{link.label}</span>
          <span className="rowChevron" aria-hidden="true" />
        </DetailLink>
      ))}
    </div>
  );
}

export function MemoCard({
  id,
  icon,
  title,
  meta,
  defaultOpen,
  links,
  className,
  dataCategory,
  children,
}: {
  id?: string;
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  links?: readonly MemoLink[];
  className?: string;
  dataCategory?: string;
  children: ReactNode;
}) {
  return (
    <details
      className={className ? `card mediaDetails memoCollapsible ${className}` : 'card mediaDetails memoCollapsible'}
      id={id}
      data-category={dataCategory || undefined}
      open={defaultOpen || undefined}
    >
      <summary className="memoCollapsibleSummary">
        <div className="memoCardHead">
          <span className="memoUnifiedIcon" aria-hidden="true">
            {icon}
          </span>
          <div className="memoHeadText">
            <h2>{title}</h2>
            {meta && <div className="memoHeadMeta">{meta}</div>}
          </div>
        </div>
      </summary>
      <div className="memoCollapsibleBody">
        {children}
        {links && links.length > 0 && <MemoChipLinks links={links} />}
      </div>
    </details>
  );
}
