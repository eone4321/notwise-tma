import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { lightHaptic } from '../telegram/client';
import { profileRequest } from './guideProfile';

type List = 'completed' | 'collected';
type Marks = Record<List, number[]>;
type Progress = Marks & { percentages: Record<string, number> | null };
type Change = { list: List; id: number; checked: boolean };
const key = (list: List, user?: string) => 'notwise.guide.' + list + (user ? '.' + user : '');

function read(list: List, user?: string): number[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key(list, user)) ?? '[]');
    return Array.isArray(stored) ? [...new Set(stored.filter(value => Number.isInteger(value) && value >= 1 && value <= 100))] : [];
  } catch { return []; }
}

function save(list: List, ids: number[], user?: string) {
  try { localStorage.setItem(key(list, user), JSON.stringify(ids)); } catch { /* Private storage may be disabled. */ }
}

const Context = createContext<Progress & {
  error: string; setMark: (list: List, id: number, checked: boolean) => void; retry: () => void;
} | null>(null);

export function useProgress() {
  const progress = useContext(Context);
  if (!progress) throw new Error('Progress provider missing');
  return progress;
}

const migrated = (user: string) => 'notwise.guide.imported.' + user;
const importOwner = 'notwise.guide.importOwner';

export function GuideProgress({ user, children }: { user?: string; children: ReactNode }) {
  const session = useMemo(() => {
    const rawCompleted = read('completed', user);
    const rawCollected = read('collected', user);
    const mergedCollected = [...new Set([...rawCollected, ...rawCompleted])];
    return {
      initial: { completed: rawCompleted, collected: mergedCollected, percentages: null } as Progress,
      queue: [] as Change[],
      working: false,
      controller: null as AbortController | null,
    };
  }, [user]);
  const [snapshot, setSnapshot] = useState({ session, data: session.initial, error: '' });
  const data = snapshot.session === session ? snapshot.data : session.initial;
  const error = snapshot.session === session ? snapshot.error : '';

  function apply(progress: Progress) {
    const mergedCollected = [...new Set([...progress.collected, ...progress.completed])];
    const normalized = { ...progress, collected: mergedCollected };
    save('completed', normalized.completed, user);
    save('collected', normalized.collected, user);
    setSnapshot({ session, data: session.queue.reduce(changed, normalized), error: '' });
  }

  async function sync(refresh: boolean) {
    const signal = session.controller?.signal;
    if (!user || !signal || signal.aborted || session.working) return;
    session.working = true;
    try {
      const imported = localStorage.getItem(migrated(user)) === '1';
      if (refresh || !imported) {
        const owner = localStorage.getItem(importOwner);
        const includeLocal = !imported && (!owner || owner === user);
        const result = await profileRequest<Progress>({
          action: 'progress',
          ...(includeLocal && { completed: read('completed'), collected: read('collected') }),
        }, signal);
        if (signal.aborted) return;
        if (includeLocal) localStorage.setItem(importOwner, user);
        localStorage.setItem(migrated(user), '1');
        apply(result);
      }
      while (!signal.aborted && session.queue.length) {
        const change = session.queue[0];
        const result = await profileRequest<Progress>({
          action: 'mark', group: change.list === 'completed' ? 'c' : 's', id: change.id, checked: change.checked,
        }, signal);
        if (signal.aborted) return;
        session.queue.shift();
        apply(result);
      }
    } catch {
      if (!signal.aborted) setSnapshot(current => ({
        session, data: current.session === session ? current.data : session.initial, error: 'Синхронизация недоступна.',
      }));
    } finally {
      if (session.controller?.signal === signal) session.working = false;
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    session.controller = controller;
    session.working = false;
    const refresh = () => { if (!document.hidden) void sync(true); };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [session]);

  function setMark(list: List, id: number, checked: boolean) {
    lightHaptic();
    const otherList: List = list === 'completed' ? 'collected' : 'completed';
    const changes: Change[] = [
      { list, id, checked },
      { list: otherList, id, checked },
    ];
    if (user) {
      session.queue.push(...changes);
      setSnapshot(current => ({
        session, data: changes.reduce(changed, current.session === session ? current.data : session.initial), error,
      }));
      void sync(false);
    } else {
      let next = data;
      for (const change of changes) {
        next = changed(next, change);
        save(change.list, next[change.list], user);
      }
      setSnapshot({ session, data: next, error: '' });
    }
  }
  return <Context.Provider value={{ ...data, error, setMark, retry: () => void sync(true) }}>{children}</Context.Provider>;
}

function changed(state: Progress, { list, id, checked }: Change) {
  const ids = state[list];
  return { ...state, [list]: checked ? [...new Set([...ids, id])] : ids.filter(value => value !== id) };
}

export function ProgressStatus() {
  const { error, retry } = useProgress();
  return error ? <p className="caption" role="status">{error} <button className="inlineAction" onClick={retry}>Повторить</button></p> : null;
}
