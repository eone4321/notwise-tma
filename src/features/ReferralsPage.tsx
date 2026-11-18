import { useState, type FormEvent } from 'react';
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
  const [more, setMore] = useState<GuideProfile['invited']>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const url = guideShareUrl(profile?.referralCode);
  const value = input ?? profile?.gameLink ?? '';
  const invited = [...(profile?.invited ?? []), ...more];

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const next = await profileRequest<GuideProfile>({ action: value.trim() ? 'save' : 'remove', gameLink: value.trim() });
      onSave(next);
      setMore([]);
      setInput(null);
      setMessage(next.gameLink ? 'Игровая ссылка сохранена.' : 'Игровая ссылка удалена.');
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'invalid_game_link'
        ? 'Вставь полную ссылку из раздела «Друзья» в игре.'
        : 'Сохранение не удалось. Попробуй ещё раз.');
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Ссылка на гайд скопирована.');
    } catch {
      setMessage('Выдели и скопируй ссылку из поля ниже.');
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
        <button className="secondary" onClick={copy}>Копировать</button>
        <button className="primary" onClick={() => shareGuide(url)}>Поделиться</button>
      </div>
      <label className="field">Ссылка на гайд<input type="url" readOnly value={url} onFocus={event => event.currentTarget.select()}/></label>
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
        <form onSubmit={save}>
          <label className="field">Игровая ссылка<input type="url" inputMode="url" value={value}
            maxLength={512} onChange={event => setInput(event.target.value)} placeholder="https://t.me/notwise_bot/thegame?startapp=…" /></label>
          <button className="secondary" disabled={saving || input === null}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
        </form>
        <a className="textLink" href="https://t.me/notwise_bot/thegame">Друзья и награды в игре</a>
      </section>
    </>}
    <section className="card">
      <details><summary>Что дают приглашения в игре?</summary>
        <p>Приглашённый получает 5 000 монет и реферальное яйцо. Тебе начисляются монеты когда друзья вступают или повышают уровень. Награды идут с трёх уровней цепочки приглашений.</p>
        <a className="textLink" href="https://t.me/notwise_bot/thegame">Посмотреть друзей в игре</a>
      </details>
    </section>
    <p role="status" className="referralStatus">{message}</p>
  </>;
}
