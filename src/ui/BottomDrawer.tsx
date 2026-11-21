import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useBackOverlay } from '../app/navigation';
import { lightHaptic } from '../telegram/client';

let lockDepth = 0;
let prevOverflow = '';

function lockRootScroll() {
  if (lockDepth === 0) {
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }
  lockDepth += 1;
  return () => {
    lockDepth = Math.max(0, lockDepth - 1);
    if (lockDepth === 0) {
      document.documentElement.style.overflow = prevOverflow;
    }
  };
}

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function BottomDrawer({
  title,
  closeLabel,
  onClose,
  panelClassName,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  panelClassName?: string;
  children: ReactNode | ((requestClose: () => void) => ReactNode);
}) {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reduceMotion()) {
      onCloseRef.current();
      return;
    }
    setClosing(true);
    timerRef.current = window.setTimeout(() => {
      onCloseRef.current();
    }, 210);
  }, []);

  useBackOverlay(true, close);

  useEffect(() => {
    const unlock = lockRootScroll();
    headingRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
      unlock();
    };
  }, [close]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`radarSheetBackdrop${closing ? ' isClosing' : ''}`}
      onClick={event => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className={`radarSheetPanel buildSheetPanel${panelClassName ? ` ${panelClassName}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="radarSheetHandle" aria-hidden="true" />
        <header className="buildHeading">
          <h2 id={titleId} ref={headingRef} tabIndex={-1}>
            {title}
          </h2>
          <button
            className="close"
            type="button"
            aria-label={closeLabel}
            onClick={() => {
              lightHaptic();
              close();
            }}
          >
            ×
          </button>
        </header>
        <div className="dialogBody">
          {typeof children === 'function' ? children(close) : children}
        </div>
      </section>
    </div>,
    document.body
  );
}
