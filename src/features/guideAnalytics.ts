import { useEffect } from 'react';
import { guidePages, type GuideEvent } from '../domain/guide-events';
import { authData } from './guideProfile';

const sent = new Map<GuideEvent, number>();
const pending = new Set<GuideEvent>();

export function trackGuide(event: GuideEvent) {
  const initData = authData();
  const now = Date.now();
  if (!initData || pending.has(event) || now - (sent.get(event) ?? 0) < 15 * 60_000) return;
  pending.add(event);
  void fetch('/api/guide/profile', {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: 'tma ' + initData },
    body: JSON.stringify({ action: 'track', event }),
  }).then(response => {
    if (response.ok) {
      sent.set(event, now);
      if (event.startsWith('view:')) window.dispatchEvent(new Event('guide-awards-refresh'));
    }
  }).catch(() => {}).finally(() => pending.delete(event));
}

export function useGuideAnalytics(pathname: string) {
  useEffect(() => {
    const page = pathname.split('/')[1] || 'home';
    if (Object.hasOwn(guidePages, page)) trackGuide(`view:${page as keyof typeof guidePages}`);
  }, [pathname]);
}
