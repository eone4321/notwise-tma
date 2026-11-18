import { telegramPopup } from '../telegram/client';

export type GuideMember = { id: string; name: string; joinedAt: number; seenAt: number };
export type GuideProfile = {
  gameLink: string | null;
  gameEntry: string | null;
  invited: Pick<GuideMember, 'name' | 'joinedAt'>[];
  invitedCount: number;
  referralCode: string;
  isAdmin: boolean;
};

export const defaultGameLink = 'https://t.me/notwise_bot/thegame?startapp=a51c09d4110f4f18baac577a6eec011a';
const guideUrl = import.meta.env.VITE_GUIDE_TMA_URL || 'https://t.me/NotWiseGuideBot?startapp';

export function guideShareUrl(referralCode?: string) {
  return referralCode ? guideUrl.split('?')[0] + '?startapp=' + referralCode : guideUrl;
}

export function shareGuide(url: string) {
  const shareUrl = 'https://t.me/share/url?' + new URLSearchParams({ url, text: 'Гайд по NOT Wise' });
  const telegram = telegramPopup();
  if (telegram?.initData && telegram.openTelegramLink) telegram.openTelegramLink(shareUrl);
  else window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

export const authData = () => telegramPopup()?.initData as string | undefined;

export async function profileRequest<T>(body: object, signal?: AbortSignal): Promise<T> {
  const initData = authData();
  if (!initData) throw new Error('telegram_required');
  const response = await fetch('/api/guide/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'tma ' + initData },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error ?? 'unavailable');
  }
  return response.json();
}
