import { useLayoutEffect, type RefObject } from 'react';

let lockCount = 0;
let unlock: (() => void) | undefined;

function lockPage() {
  if (lockCount++ === 0) {
    const scrollY = window.scrollY;
    const body = document.body;
    const { position, top, left, right, overflow } = body.style;
    Object.assign(body.style, { position: 'fixed', top: -scrollY + 'px', left: '0', right: '0', overflow: 'hidden' });
    unlock = () => {
      Object.assign(body.style, { position, top, left, right, overflow });
      window.scrollTo(0, scrollY);
    };
  }
  return () => {
    if (--lockCount === 0) {
      unlock?.();
      unlock = undefined;
    }
  };
}

export function useModal(dialog: RefObject<HTMLDialogElement | null>, open: boolean) {
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const release = lockPage();
    element.showModal();
    element.querySelector<HTMLElement>('[data-dialog-title]')?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
      release();
    };
  }, [dialog, open]);
}
