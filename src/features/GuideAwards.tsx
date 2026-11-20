import { useCallback, useEffect, useRef, useState } from 'react';
import { guideAchievements, type GuideAchievement } from '../domain/guide-achievements';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { lightHaptic } from '../telegram/client';
import { authData, profileRequest } from './guideProfile';

type Awards = { earned: GuideAchievement[]; joined?: boolean; chatIssue?: string };
type AwardAction = 'achievements' | 'mascot' | 'check_chat' | 'visit_squad';

export function useGuideAwards(user?: string) {
  const [earned, setEarned] = useState<GuideAchievement[]>([]);
  const [chatIssue, setChatIssue] = useState<string>();
  const [notices, setNotices] = useState<GuideAchievement[]>([]);
  const [toast] = notices;
  const seen = useRef(new Set<GuideAchievement>());
  const ready = useRef(false);
  const timers = useRef<number[]>([]);

  const dismissToast = useCallback(() => {
    setNotices(queue => queue.slice(1));
  }, []);

  useEffect(() => {
    if (!toast) return;
    lightHaptic();
    const timer = window.setTimeout(dismissToast, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  useEffect(() => {
    const onTest = (event: Event) => {
      const award = (event as CustomEvent<unknown>).detail;
      if (typeof award === 'string' && Object.hasOwn(guideAchievements, award)) {
        setNotices(queue => [...queue.filter(item => item !== award), award as GuideAchievement]);
      }
    };
    window.addEventListener('guide-award-test', onTest);
    return () => window.removeEventListener('guide-award-test', onTest);
  }, []);

  const update = useCallback(async (action: AwardAction = 'achievements') => {
    if (!authData()) return;
    const result = await profileRequest<Awards>({ action }, undefined, action === 'visit_squad');
    setChatIssue(result.earned.includes('community') ? undefined : result.chatIssue);
    const added = result.earned.filter(item => Object.hasOwn(guideAchievements, item) && !seen.current.has(item));
    added.forEach(item => seen.current.add(item));
    const newNotices = ready.current ? added : added.filter(item =>
      (action === 'mascot' && item === 'mascot') || (action === 'check_chat' && item === 'community') ||
      (action === 'visit_squad' && item === 'squad'));
    if (newNotices.length) setNotices(queue => [...queue, ...newNotices]);
    setEarned([...seen.current]);
    ready.current = true;
    return result;
  }, []);

  const chatPending = useRef(false);
  const runChatCheck = useCallback(() => {
    if (seen.current.has('community')) return;
    void update('check_chat').then(result => {
      if (!result?.joined) return;
      chatPending.current = false;
      sessionStorage.removeItem('notwise.guide.chat-visit');
      timers.current.forEach(id => window.clearTimeout(id));
      timers.current = [];
    }).catch(() => {});
  }, [update]);

  function noteChatVisit() {
    chatPending.current = true;
    if (authData()) sessionStorage.setItem('notwise.guide.chat-visit', '1');
    timers.current.forEach(id => window.clearTimeout(id));
    timers.current = [3500, 9000].map(delay => window.setTimeout(() => {
      if (document.visibilityState === 'visible') runChatCheck();
    }, delay));
  }

  useEffect(() => () => {
    timers.current.forEach(id => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => {
    if (!user) return;
    const refresh = () => { void update().catch(() => {}); };
    const visible = () => {
      if (document.visibilityState !== 'visible') return;
      if (seen.current.has('community') || (!chatPending.current && !sessionStorage.getItem('notwise.guide.chat-visit'))) {
        refresh();
        return;
      }
      runChatCheck();
    };
    const checkNow = () => { runChatCheck(); };
    visible();
    window.addEventListener('guide-awards-refresh', refresh);
    window.addEventListener('guide-awards-check-chat', checkNow);
    window.addEventListener('focus', visible);
    window.addEventListener('pageshow', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('guide-awards-refresh', refresh);
      window.removeEventListener('guide-awards-check-chat', checkNow);
      window.removeEventListener('focus', visible);
      window.removeEventListener('pageshow', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [runChatCheck, update, user]);

  return { earned, chatIssue, toast, dismissToast, update, noteChatVisit };
}

export function AwardIcon({ award, size = 28 }: { award: GuideAchievement; size?: number }) {
  return <span className="awardPortrait" data-award={award} aria-hidden="true">
    <GameArt path={guideAchievements[award].icon} size={size}/>
    {award === 'community' && <span className="awardPortraitMark"><GameGlyph name="chat"/></span>}
    {award === 'squad' && <span className="awardPortraitMark"><GameGlyph name="shield"/></span>}
  </span>;
}

export function AwardToast({ award, onDismiss }: { award?: GuideAchievement; onDismiss?: () => void }) {
  const reduce = useReducedMotion();
  const entry = award ? guideAchievements[award] : null;
  return <div className="awardNoticeHost">
    <AnimatePresence initial={false} mode="wait">
      {award && entry && <motion.aside className="awardToast" role="status" key={award}
        onClick={onDismiss}
        initial={{ y: reduce ? 0 : -22, opacity: 0, scale: reduce ? 1 : .94 }}
        animate={{ y: 0, opacity: 1, scale: 1, transition: reduce ? { duration: .15 } : { type: 'spring', stiffness: 420, damping: 28 } }}
        exit={{ y: reduce ? 0 : -14, opacity: 0, scale: reduce ? 1 : .96, transition: { duration: reduce ? .15 : .24, ease: [.2, 0, .4, 1] } }}>
        <span className="awardToastBadge"><AwardIcon award={award} size={34}/></span>
        <div className="awardToastCopy">
          <span className="awardToastEyebrow"><GameGlyph name="treasure"/>Новое достижение</span>
          <strong>{entry.title}</strong>
          <p>{entry.description}</p>
        </div>
        <span className="awardToastCheck" aria-hidden="true">✓</span>
        <span className="awardToastTimer" aria-hidden="true"/>
      </motion.aside>}
    </AnimatePresence>
  </div>;
}
