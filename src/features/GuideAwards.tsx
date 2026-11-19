import { useCallback, useEffect, useRef, useState } from 'react';
import { guideAchievements, type GuideAchievement } from '../domain/guide-achievements';
import { GameArt } from '../ui/GameArt';
import { authData, profileRequest } from './guideProfile';

type Awards = { earned: GuideAchievement[]; joined?: boolean };
type AwardAction = 'achievements' | 'mascot' | 'check_chat';

export function useGuideAwards(user?: string) {
  const [earned, setEarned] = useState<GuideAchievement[]>([]);
  const [toast, setToast] = useState<GuideAchievement>();
  const seen = useRef(new Set<GuideAchievement>());
  const ready = useRef(false);
  const timer = useRef(0);

  const update = useCallback(async (action: AwardAction = 'achievements') => {
    if (!authData()) return;
    const result = await profileRequest<Awards>({ action });
    const added = result.earned.filter(item => Object.hasOwn(guideAchievements, item) && !seen.current.has(item));
    added.forEach(item => seen.current.add(item));
    if (added.length && (ready.current || action !== 'achievements')) {
      window.clearTimeout(timer.current);
      setToast(added[added.length - 1]);
      timer.current = window.setTimeout(() => setToast(undefined), 4400);
    }
    setEarned([...seen.current]);
    ready.current = true;
    return result;
  }, []);

  const chatPending = useRef(false);
  function noteChatVisit() {
    chatPending.current = true;
    if (authData()) sessionStorage.setItem('notwise.guide.chat-visit', '1');
  }

  useEffect(() => {
    if (!user) return;
    const refresh = () => { void update().catch(() => {}); };
    const visible = () => {
      if (document.visibilityState !== 'visible') return;
      if (seen.current.has('community') || (!chatPending.current && !sessionStorage.getItem('notwise.guide.chat-visit'))) {
        refresh();
        return;
      }
      void update('check_chat').then(result => {
        if (!result?.joined) return;
        chatPending.current = false;
        sessionStorage.removeItem('notwise.guide.chat-visit');
      }).catch(refresh);
    };
    visible();
    window.addEventListener('guide-awards-refresh', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('guide-awards-refresh', refresh);
      document.removeEventListener('visibilitychange', visible);
      window.clearTimeout(timer.current);
    };
  }, [update, user]);

  return { earned, toast, update, noteChatVisit };
}

export function AwardToast({ award }: { award?: GuideAchievement }) {
  if (!award) return null;
  const item = guideAchievements[award];
  return <aside className="awardToast" role="status" key={award}>
    <GameArt path={item.icon} size={38}/>
    <div><small>Достижение открыто</small><strong>{item.title}</strong></div>
  </aside>;
}
