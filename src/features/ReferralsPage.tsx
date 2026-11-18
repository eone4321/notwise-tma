import { useState, useRef, type FormEvent } from 'react';
import { GameArt } from '../ui/GameArt';
import { authData, guideShareUrl, profileRequest, shareGuide, type GuideProfile } from './guideProfile';

type Props = {
  profile: GuideProfile | null;
  failed: boolean;
  onSave: (profile: GuideProfile) => void;
  onRetry: () => void;
};

const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' });

export function ReferralsPage({ profile, failed, onSave, onRetry }: Props) {
  const [input, setInput] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [linkMessage, setLinkMessage] = useState('');
  const [more, setMore] = useState<GuideProfile['invited']>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const url = guideShareUrl(profile?.referralCode);
  const value = input ?? profile?.gameLink ?? '';
  const invited = [...(profile?.invited ?? []), ...more];
  const canEnterLink = subscribed ?? profile?.gameLinkVerified ?? false;

  async function checkSubscription() {
    setChecking(true);
    setLinkMessage('');
    try {
      const result = await profileRequest<{ subscribed: boolean }>({ action: 'check_subscription' });
      setSubscribed(result.subscribed);
      if (!result.subscribed) setLinkMessage('Подпишись на канал и проверь подписку ещё раз.');
    } catch {
      setLinkMessage('Telegram не подтвердил подписку. Попробуй ещё раз.');
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
      setLinkMessage(next.gameLink ? 'Игровая ссылка сохранена.' : 'Игровая ссылка удалена.');
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      if (reason === 'subscription_required') {
        setSubscribed(false);
        setLinkMessage('Подпишись на канал и подтверди подписку.');
      } else if (reason === 'invalid_game_link') {
        setLinkMessage('Вставь полную ссылку из раздела «Друзья» в игре.');
      } else {
        setLinkMessage('Сохранение недоступно. Попробуй ещё раз.');
      }
    } finally {
      setSaving(false);
    }
  }

  const linkInput = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState('');
  async function copy() {
    setCopyStatus('Копируем…');
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('Ссылка скопирована');
      return;
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      linkInput.current?.setSelectionRange(0, url.length);
      try {
        if (document.execCommand('copy')) {
          setCopyStatus('Ссылка скопирована');
          return;
        }
      } catch { /* The selected input remains available for manual copying. */ }
      setCopyStatus('Ссылка выделена. Нажми «Копировать» в меню выделения.');
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const result = await profileRequest<{ items: GuideProfile['invited'] }>({ action: 'invited', offset: invited.length });
      setMore(current => [...current, ...result.items]);
    } catch {
      setMessage('Не удалось загрузить приглашённых.');
    } finally {
      setLoadingMore(false);
    }
  }

  return <>
    <section className="card">
      <div className="mediaHeading"><GameArt path="/game/items/referral-egg.webp" size={56}/><div>
        <h2>Твоя ссылка на гайд</h2>
        <p>Отправь её другу. После первого входа в гайд через Telegram он появится в списке.</p>
      </div></div>
      <div className="actionPair">
        <button className="secondary" onClick={copy}>{copyStatus === 'Ссылка скопирована' ? '✓ Скопировано' : 'Копировать'}</button>
        <button className="primary" onClick={() => shareGuide(url)}>Поделиться</button>
      </div>
      <p role="status" className="copyFeedback">{copyStatus}</p>
      <label className="field">Ссылка на гайд<input ref={linkInput} type="url" readOnly value={url} onFocus={event => event.currentTarget.select()}/></label>
      {!authData() && <p className="caption">Открой гайд в Telegram, чтобы получить персональную ссылку.</p>}
      {authData() && !profile && <p className="caption">{failed ? <>Профиль недоступен. <button className="inlineAction" onClick={onRetry}>Повторить</button></> : 'Загружаем персональную ссылку…'}</p>}
    </section>
    {profile && <>
      <section className="card">
        <h2>Друзья в гайде · {profile.invitedCount}</h2>
        {invited.length ? <ul className="compactList">{invited.map((friend, index) =>
          <li className="mediaRow" key={index}><strong>{friend.name}</strong><small>{date.format(friend.joinedAt)}</small></li>)}</ul>
          : <p>Здесь появятся друзья, которые впервые открыли гайд по твоей ссылке.</p>}
        {invited.length < profile.invitedCount && <button className="secondary" disabled={loadingMore} onClick={loadMore}>Показать ещё</button>}
      </section>
      <section className="card">
        <h2>Твоя ссылка из игры</h2>
        <p>В игре открой «Друзья» → «Копировать ссылку» и вставь её сюда. Тогда у приглашённых кнопка «Открыть игру» будет вести по твоей ссылке.</p>
        {!canEnterLink && <div className="actionPair referralGate">
          <a className="secondary" href="https://t.me/cryptoeone">Подписаться на канал</a>
          <button className="secondary" disabled={checking} onClick={checkSubscription}>
            {checking ? 'Проверяем…' : 'Проверить подписку'}
          </button>
        </div>}
        {canEnterLink && <form onSubmit={save}>
          <label className="field">Игровая ссылка<input type="url" inputMode="url" value={value}
            maxLength={512} onChange={event => setInput(event.target.value)} placeholder="https://t.me/notwise_bot/thegame?startapp=…" /></label>
          <button className="secondary" disabled={saving || (input === null && (!profile.gameLink || profile.gameLinkVerified))}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
        </form>}
        {linkMessage && <p className="referralStatus" role="status">{linkMessage}</p>}
        <a className="textLink" href="https://t.me/notwise_bot/thegame">Друзья и награды в игре</a>
      </section>
    </>}
    <section className="card">
      <details><summary>Что дают приглашения в игре?</summary>
        <p>Приглашённый получает 5 000 монет и реферальное яйцо. Тебе начисляются монеты когда друзья вступают или повышают уровень. Награды идут с трёх уровней цепочки приглашений. За задания на 3, 5 и 10 друзей игра начисляет 3 000, 7 000 и 15 000 монет соответственно.</p>
        <a className="textLink" href="https://t.me/notwise_bot/thegame">Посмотреть друзей в игре</a>
      </details>
    </section>
    <p role="status" className="referralStatus">{message}</p>
  </>;
}
