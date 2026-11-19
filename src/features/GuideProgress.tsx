import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
  const [data, setData] = useState<Progress>(() => ({
    completed: read('completed', user), collected: read('collected', user), percentages: null,
  }));
  const [error, setError] = useState('');
  const queue = useRef<Change[]>([]);
  const working = useRef(false);
  const active = useRef(false);

  function apply(progress: Progress) {
    save('completed', progress.completed, user);
    save('collected', progress.collected, user);
    setData(queue.current.reduce((state, change) => changed(state, change), progress));
  }

  async function sync(refresh: boolean) {
    if (!user || working.current) return;
    working.current = true;
    try {
      const imported = localStorage.getItem(migrated(user)) === '1';
      if (refresh || !imported) {
        const owner = localStorage.getItem(importOwner);
        const includeLocal = !imported && (!owner || owner === user);
        const result = await profileRequest<Progress>({
          action: 'progress',
          ...(includeLocal && { completed: read('completed'), collected: read('collected') }),
        });
        if (!active.current) return;
        if (includeLocal) localStorage.setItem(importOwner, user);
        localStorage.setItem(migrated(user), '1');
        apply(result);
      }
      while (active.current && queue.current.length) {
        const change = queue.current[0];
        const result = await profileRequest<Progress>({
          action: 'mark', group: change.list === 'completed' ? 'c' : 's', id: change.id, checked: change.checked,
        });
        queue.current.shift();
        if (active.current) apply(result);
      }
      if (active.current) setError('');
    } catch {
      if (active.current) setError('Синхронизация недоступна.');
    } finally {
      working.current = false;
    }
  }

  useEffect(() => {
    active.current = true;
    const refresh = () => { if (!document.hidden) void sync(true); };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      active.current = false;
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [user]);

  function setMark(list: List, id: number, checked: boolean) {
    lightHaptic();
    const change = { list, id, checked };
    if (user) {
      queue.current.push(change);
      setData(state => changed(state, change));
      void sync(false);
    } else {
      const next = changed(data, change);
      save(list, next[list]);
      setData(next);
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
