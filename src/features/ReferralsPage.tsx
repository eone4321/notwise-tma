import { trackGuide } from './guideAnalytics';
import { channelInvite } from '../domain/guide-links';
import { copyLink } from '../ui/copyLink';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import { GameGlyph } from '../ui/GameGlyph';
import { GameArt } from '../ui/GameArt';
import { authData, defaultGameLink, guideShareUrl, profileRequest, shareGuide, type GuideProfile } from './guideProfile';
import { useGuideLocale } from './guideLocale';

type Props = {
  profile: GuideProfile | null;
  failed: boolean;
  onSave: (profile: GuideProfile) => void;
  onRetry: () => void;
};

const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' });
const dateEn = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export function ReferralsPage({ profile, failed, onSave, onRetry }: Props) {
  const { locale } = useGuideLocale(profile?.language);
  const en = locale === 'en';
  const dateFmt = en ? dateEn : date;
  const [input, setInput] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [linkMessage, setLinkMessage] = useState('');
  const [more, setMore] = useState<GuideProfile['invited']>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const url = guideShareUrl(profile?.gameLinkVerified ? profile.referralCode : undefined);
  const value = input ?? profile?.gameLink ?? '';
  const invited = [...(profile?.invited ?? []), ...more];
  const canEnterLink = subscribed ?? profile?.gameLinkVerified ?? false;

  async function checkSubscription() {
    setChecking(true);
    setLinkMessage('');
    try {
      const result = await profileRequest<{ subscribed: boolean }>({ action: 'check_subscription' });
      setSubscribed(result.subscribed);
      if (!result.subscribed) setLinkMessage(en ? 'Subscribe to the channel and check again.' : 'Подпишись на канал и проверь подписку ещё раз.');
    } catch {
      setLinkMessage(en ? 'Telegram could not verify your subscription. Try again.' : 'Telegram не подтвердил подписку. Попробуй ещё раз.');
    } finally {
      setChecking(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setLinkMessage('');
    try {
      const next = await profileRequest<GuideProfile>({ action: value.trim() ? 'save' : 'remove', gameLink: value.trim() });
      onSave(next);
      setMore([]);
      setInput(null);
      if (next.gameLinkVerified) setSubscribed(true);
      setLinkMessage(next.gameLink ? (en ? 'Game link saved.' : 'Игровая ссылка сохранена.') : (en ? 'Game link removed.' : 'Игровая ссылка удалена.'));
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      if (reason === 'subscription_required') {
        setSubscribed(false);
        setLinkMessage(en ? 'Subscribe to the channel and verify your subscription.' : 'Подпишись на канал и подтверди подписку.');
      } else if (reason === 'invalid_game_link') {
        setLinkMessage(en ? 'Paste the full referral link from the Friends section in the game.' : 'Вставь полную ссылку из раздела «Друзья» в игре.');
      } else {
        setLinkMessage(en ? 'Unable to save right now. Try again.' : 'Сохранение недоступно. Попробуй ещё раз.');
      }
    } finally {
      setSaving(false);
    }
  }

  const linkInput = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState('');
  async function copy() {
    setCopyStatus(en ? 'Copying…' : 'Копируем…');
    const copied = await copyLink(url, linkInput.current);
    if (copied) trackGuide('action:share_copy');
    setCopyStatus(copied
      ? (en ? 'Link copied' : 'Ссылка скопирована')
      : (en ? 'Link selected. Tap "Copy" in the selection menu.' : 'Ссылка выделена. Нажми «Копировать» в меню выделения.'));
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const result = await profileRequest<{ items: GuideProfile['invited'] }>({ action: 'invited', offset: invited.length });
      setMore(current => [...current, ...result.items]);
    } catch {
      setMessage(en ? 'Failed to load invited friends.' : 'Не удалось загрузить приглашённых.');
    } finally {
      setLoadingMore(false);
    }
  }

  const isCopied = copyStatus === 'Ссылка скопирована' || copyStatus === 'Link copied';

  return <>
    <section className="card">
      <div className="mediaHeading"><span className="gameActionTile"><GameGlyph name="chat"/></span><div>
        <h2>{en ? 'Invite friends to Not Wise' : 'Приглашай друзей в Not Wise'}</h2>
        <p>{profile?.gameLinkVerified
          ? (en
            ? 'Share your personal link. Your friend’s "Open game" button will use your game referral link.'
            : 'Поделись персональной ссылкой. У приглашённого кнопка «Открыть игру» поведёт по твоей игровой рефке.')
          : (en
            ? 'Invite a friend to the game: they get an egg and 5,000 coins, and you earn in-game rewards as they progress.'
            : 'Пригласи друга в игру: он получит яйцо и 5 000 монет, а ты сможешь получать игровые награды за его прогресс.')}</p>
      </div></div>
      {profile?.gameLinkVerified && <><div className="actionPair">
        <button className="secondary" onClick={copy}>{isCopied ? (en ? '✓ Copied' : '✓ Скопировано') : (en ? 'Copy' : 'Копировать')}</button>
        <button className="primary" onClick={() => {
          trackGuide('action:share_send');
          shareGuide(
            url,
            en
              ? 'Join me in NOT Wise! Open the guide and tap "Open game" to join via my invite.'
              : 'Приглашаю в NOT Wise! Открой гайд и нажми «Открыть игру», чтобы вступить по моему приглашению.',
          );
        }}>{en ? 'Invite a friend' : 'Пригласить друга'}</button>
      </div>
      <p role="status" className="copyFeedback">{copyStatus}</p>
      <label className="field">{en ? 'Guide link' : 'Ссылка на гайд'}<input ref={linkInput} type="url" readOnly value={url} onFocus={event => event.currentTarget.select()}/></label></>}
      <button type="button" className="secondary plainGuideShare" onClick={() => { trackGuide('action:share_send'); shareGuide(guideShareUrl(), en ? 'NOT Wise Guide' : 'Гайд по NOT Wise', false); }}>
        <GameGlyph name="share"/> {en ? 'Share guide without referral' : 'Поделиться гайдом без рефки'}
      </button>
      {!authData() && <p className="caption">{en ? 'Open the guide in Telegram to get a personal referral link.' : 'Открой гайд в Telegram, чтобы получить персональную ссылку.'}</p>}
      {authData() && !profile && <p className="caption">{failed ? <>{en ? 'Profile unavailable.' : 'Профиль недоступен.'} <button className="inlineAction" onClick={onRetry}>{en ? 'Retry' : 'Повторить'}</button></> : (en ? 'Loading personal link…' : 'Загружаем персональную ссылку…')}</p>}
    </section>
    {profile && <>
      <section className="card">
        <h2>{profile.gameLinkVerified ? (en ? 'Your Not Wise referral link' : 'Твоя рефка Not Wise') : (en ? 'Link your Not Wise referral' : 'Привяжи рефку Not Wise')}</h2>
        <p>{en
          ? 'Open "Friends" in Not Wise, copy your game referral link, and save it here. The guide will wrap it into a personal invite.'
          : 'Открой «Друзья» в Not Wise, скопируй игровую ссылку и сохрани её здесь. После этого гайд соберёт персональное приглашение для отправки.'}</p>
        {!canEnterLink && <div className="actionPair referralGate">
          <a className="secondary" href={channelInvite} onClick={() => trackGuide('action:channel')}>{en ? 'Subscribe to channel' : 'Подписаться на канал'}</a>
          <button className="secondary" disabled={checking} onClick={checkSubscription}>
            {checking ? (en ? 'Checking…' : 'Проверяем…') : (en ? 'Check subscription' : 'Проверить подписку')}
          </button>
        </div>}
        {canEnterLink && <form onSubmit={save}>
          <label className="field">{en ? 'Game referral link' : 'Игровая ссылка'}<input type="url" inputMode="url" value={value}
            maxLength={512} onChange={event => setInput(event.target.value)} placeholder="https://t.me/notwise_bot/thegame?startapp=…" /></label>
          <button className="secondary" disabled={saving || (input === null && (!profile.gameLink || profile.gameLinkVerified))}>{saving ? (en ? 'Saving…' : 'Сохраняем…') : (en ? 'Save' : 'Сохранить')}</button>
        </form>}
        {linkMessage && <p className="referralStatus" role="status">{linkMessage}</p>}
        <a className="textLink" href={profile?.gameEntry ?? defaultGameLink} onClick={() => trackGuide('action:game')}>{en ? 'Open Not Wise and copy referral link' : 'Открыть Not Wise и взять рефку'}</a>
      </section>
      <section className="card">
        <h2>{en ? `Opened guide via your link · ${profile.invitedCount}` : `Открыли гайд по ссылке · ${profile.invitedCount}`}</h2>
        {invited.length ? <ul className="compactList">{invited.map((friend, index) =>
          <li className="mediaRow invitedFriend" key={friend.joinedAt + ':' + index}>
            <FriendAvatar name={friend.name} avatar={friend.avatar}/>
            <strong>{friend.name}</strong><small>{dateFmt.format(friend.joinedAt)}</small>
          </li>)}</ul>
          : <p>{en ? 'Friends who open the guide via your link for the first time will appear here.' : 'Здесь появятся друзья, которые впервые открыли гайд по твоей ссылке.'}</p>}
        {invited.length < profile.invitedCount && <button className="secondary" disabled={loadingMore} onClick={loadMore}>{en ? 'Show more' : 'Показать ещё'}</button>}
      </section>
    </>}
    <section className="card">
      <details><summary>{en ? 'What do in-game referrals give?' : 'Что дают приглашения в игре?'}</summary>
        <div className="referralRewards">
          <div className="mediaHeading"><GameArt path="/game/items/referral-egg.webp" size={34}/><div>
            <h3>{en ? 'For your friend' : 'Другу'}</h3><p>{en ? 'A referral egg and 5,000 coins for joining the game.' : 'Реферальное яйцо и 5 000 монет за вступление в игру.'}</p>
          </div></div>
          <div className="mediaHeading"><GameArt path="/game/items/wise-coin.webp" size={34}/><div>
            <h3>{en ? 'For you' : 'Тебе'}</h3><p>{en ? 'Coins for friends joining and leveling up. Referrals count up to 3 levels deep.' : 'Монеты за вступление и прокачку друзей. Учитываются приглашения в цепочке до третьего уровня.'}</p>
          </div></div>
          <p>{en ? 'Quests for 3, 5, and 10 friends reward 3,000, 7,000, and 15,000 coins respectively.' : 'Задания на 3, 5 и 10 друзей дают 3 000, 7 000 и 15 000 монет соответственно.'}</p>
        </div>
        <a className="textLink" href={profile?.gameEntry ?? defaultGameLink} onClick={() => trackGuide('action:game')}>{en ? 'View friends in the game' : 'Посмотреть друзей в игре'}</a>
      </details>
    </section>
    <p role="status" className="referralStatus">{message}</p>
  </>;
}

const avatars = new Map<string, Promise<HTMLImageElement | undefined>>();

export function warmFriendAvatar(url: string) {
  if (!avatars.has(url)) {
    const image = new Image();
    image.referrerPolicy = 'no-referrer';
    image.src = url;
    avatars.set(url, image.decode().then(() => image, () => undefined));
  }
  return avatars.get(url)!;
}

function FriendAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const [source, setSource] = useState<string>();
  useEffect(() => {
    if (!avatar) return;
    let active = true;
    void warmFriendAvatar(avatar).then(image => { if (active) setSource(image?.src); });
    return () => { active = false; };
  }, [avatar]);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
  return <span className="friendAvatar" aria-hidden="true">{source && source === avatar
    ? <img src={source} referrerPolicy="no-referrer" alt="" width="32" height="32" onError={() => setSource(undefined)}/>
    : initials || '?'}</span>;
}
