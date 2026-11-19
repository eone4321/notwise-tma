import { useCallback, useEffect, useRef, useState } from 'react';
import { guideAchievements, type GuideAchievement } from '../domain/guide-achievements';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { authData, profileRequest } from './guideProfile';

type Awards = { earned: GuideAchievement[]; joined?: boolean };
type AwardAction = 'achievements' | 'mascot' | 'check_chat';

export function useGuideAwards(user?: string) {
  const [earned, setEarned] = useState<GuideAchievement[]>([]);
  const [notices, setNotices] = useState<GuideAchievement[]>([]);
  const [toast] = notices;
  const seen = useRef(new Set<GuideAchievement>());
  const ready = useRef(false);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setNotices(queue => queue.slice(1)), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const update = useCallback(async (action: AwardAction = 'achievements') => {
    if (!authData()) return;
    const result = await profileRequest<Awards>({ action });
    const added = result.earned.filter(item => Object.hasOwn(guideAchievements, item) && !seen.current.has(item));
    added.forEach(item => seen.current.add(item));
    const newNotices = ready.current ? added : added.filter(item =>
      (action === 'mascot' && item === 'mascot') || (action === 'check_chat' && item === 'community'));
    if (newNotices.length) setNotices(queue => [...queue, ...newNotices]);
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
    };
  }, [update, user]);

  return { earned, toast, update, noteChatVisit };
}

export function AwardIcon({ award, size = 34 }: { award: GuideAchievement; size?: number }) {
  return <span className="awardPortrait" data-award={award} aria-hidden="true">
    <GameArt path={guideAchievements[award].icon} size={size}/>
    {award === 'community' && <span className="awardPortraitMark"><GameGlyph name="chat"/></span>}
    {award === 'squad' && <span className="awardPortraitMark"><GameGlyph name="shield"/></span>}
  </span>;
}

export function AwardToast({ award }: { award?: GuideAchievement }) {
  const reduce = useReducedMotion();
  return <div className="awardNoticeHost">
    <AnimatePresence initial={false} mode="wait">
      {award && <motion.aside className="awardToast" role="status" key={award}
        initial={{ y: reduce ? 0 : -24, opacity: 0, scale: reduce ? 1 : .92 }}
        animate={{ y: 0, opacity: 1, scale: 1, transition: { duration: reduce ? .15 : .35, ease: [.21, 1.02, .73, 1] } }}
        exit={{ y: reduce ? 0 : -12, opacity: 0, scale: reduce ? 1 : .96, transition: { duration: reduce ? .15 : .4, ease: [.06, .71, .55, 1] } }}>
        <AwardIcon award={award} size={29}/>
        <div><small>Достижение открыто</small><strong>{guideAchievements[award].title}</strong></div>
      </motion.aside>}
    </AnimatePresence>
  </div>;
}
