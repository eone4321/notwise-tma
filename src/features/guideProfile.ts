import { telegramPopup } from '../telegram/client';

export type GuideMember = { id: string; name: string; avatar?: string; joinedAt: number; seenAt: number };
export type GuideProfile = {
  userId: string;
  gameLink: string | null;
  gameLinkVerified: boolean;
  gameEntry: string | null;
  invited: Pick<GuideMember, 'name' | 'joinedAt' | 'avatar'>[];
  invitedCount: number;
  referralCode: string;
  isAdmin: boolean;
  language?: string;
};

export { defaultGameLink } from '../domain/guide-links';
const guideUrl = import.meta.env.VITE_GUIDE_TMA_URL || 'https://t.me/NotWiseGuideBot?startapp';

export function guideShareUrl(referralCode?: string) {
  return referralCode ? guideUrl.split('?')[0] + '?startapp=' + referralCode : guideUrl;
}

export async function shareGuide(url: string, text = 'Гайд по NOT Wise') {
  const shareUrl = 'https://t.me/share/url?' + new URLSearchParams({ url, text });
  const telegram = telegramPopup();
  const hasCustomTarget = /[?&]startapp=b_/.test(url);
  if (!hasCustomTarget && telegram?.initData && typeof telegram.shareMessage === 'function' && telegram.isVersionAtLeast?.('8.0')) {
    try {
      const { messageId } = await profileRequest<{ messageId: string }>({
        action: 'prepare_share', personal: /[?&]startapp=g_[a-f0-9]{32}$/.test(url),
      });
      telegram.shareMessage(messageId, (sent: boolean) => {
        if (sent) void profileRequest({ action: 'shared' })
          .then(() => window.dispatchEvent(new Event('guide-awards-refresh'))).catch(() => {});
      });
      return;
    } catch { /* Use Telegram’s regular link picker if prepared sharing is unavailable. */ }
  }
  if (telegram?.initData && telegram.openTelegramLink) telegram.openTelegramLink(shareUrl);
  else window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

export const authData = () => telegramPopup()?.initData as string | undefined;

export async function profileRequest<T>(body: object, signal?: AbortSignal, keepalive = false): Promise<T> {
  const initData = authData();
  if (!initData) throw new Error('telegram_required');
  const response = await fetch('/api/guide/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'tma ' + initData },
    body: JSON.stringify(body),
    signal,
    keepalive,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error ?? 'unavailable');
  }
  return response.json();
}
