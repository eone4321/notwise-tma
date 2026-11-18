import { useEffect, useState } from 'react';
import { authData, profileRequest, type GuideMember, type GuideProfile } from './guideProfile';

const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
type Result = { items: GuideMember[]; total: number };

export function AdminPage({ profile }: { profile: GuideProfile | null }) {
  const [result, setResult] = useState<Result | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!authData()) return;
    const abort = new AbortController();
    profileRequest<Result>({ action: 'admin', offset }, abort.signal).then(setResult).catch(reason => {
      if (!abort.signal.aborted) setError(reason.message);
    });
    return () => abort.abort();
  }, [offset, attempt]);
  function page(next: number) {
    setResult(null);
    setError('');
    setOffset(next);
  }
  return <>
    <h1 className="pageTitle">Управление гайдом</h1>
    <section className="card">
      {!authData() || error === 'forbidden' || (profile && !profile.isAdmin) ? <p>Раздел доступен администраторам в Telegram.</p> :
        error ? <><p>Не удалось загрузить список.</p><button className="secondary" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Повторить</button></> :
        !result ? <p role="status">Загружаем пользователей…</p> : <>
          <h2>Пользователи · {result.total}</h2>
          <ul className="compactList">{result.items.map(member => <li className="mediaRow" key={member.id}>
            <div><strong>{member.name}</strong><small className="block">Telegram ID {member.id}</small>
              <small className="block">Первый вход: {date.format(member.joinedAt)} · Последний вход: {date.format(member.seenAt)}</small></div>
          </li>)}</ul>
          <div className="actionPair">
            {offset > 0 && <button className="secondary" onClick={() => page(Math.max(0, offset - 30))}>Предыдущие</button>}
            {offset + 30 < result.total && <button className="secondary" onClick={() => page(offset + 30)}>Следующие</button>}
          </div>
        </>}
    </section>
  </>;
}
