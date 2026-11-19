import { useEffect, useState } from 'react';
import { guideActions, guidePages, type GuideEvent } from '../domain/guide-events';
import { authData, profileRequest, type GuideMember } from './guideProfile';

const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
const dayLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const number = new Intl.NumberFormat('ru-RU');
type Members = { items: GuideMember[]; total: number };
type Daily = { day: string; active: number; events: Partial<Record<GuideEvent, number>> };
type Report = { days: Daily[] };
type Tab = 'analytics' | 'admin';

export function AdminPage({ profile }: { profile: { isAdmin: boolean } | null }) {
  const [tab, setTab] = useState<Tab>('analytics');
  const [result, setResult] = useState<Members | Report | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const canAccess = Boolean(authData()) && profile?.isAdmin !== false;

  useEffect(() => {
    if (!canAccess) return;
    const abort = new AbortController();
    profileRequest<Members | Report>({ action: tab, offset }, abort.signal).then(setResult).catch(reason => {
      if (!abort.signal.aborted) setError(reason.message);
    });
    return () => abort.abort();
  }, [canAccess, tab, offset, attempt]);

  function open(next: Tab, nextOffset = 0) {
    if (next === tab && nextOffset === offset) return;
    setResult(null);
    setError('');
    setOffset(nextOffset);
    setTab(next);
  }

  return <>
    <h1 className="pageTitle">Управление гайдом</h1>
    {!canAccess || error === 'forbidden' ? <section className="card"><p>Раздел доступен владельцу проекта в Telegram.</p></section> : <>
      <nav className="choiceBar" aria-label="Управление гайдом">
        <button aria-pressed={tab === 'analytics'} onClick={() => open('analytics')}>Аналитика</button>
        <button aria-pressed={tab === 'admin'} onClick={() => open('admin')}>Пользователи</button>
      </nav>
      {error ? <section className="card"><p>Не удалось загрузить данные.</p>
        <button className="secondary" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Повторить</button>
      </section> : !result ? <section className="card"><p role="status">Загружаем данные…</p></section> :
        'days' in result ? <Analytics days={result.days}/> :
        <section className="card">
          <h2>Пользователи · {number.format(result.total)}</h2>
          <ul className="compactList">{result.items.map(member => <li className="mediaRow" key={member.id}>
            <div><strong>{member.name}</strong><small className="block">Telegram ID {member.id}</small>
              <small className="block">Первый вход: {date.format(member.joinedAt)} · Последний вход: {date.format(member.seenAt)}</small>
            </div>
          </li>)}</ul>
          <div className="actionPair">
            {offset > 0 && <button className="secondary" onClick={() => open('admin', Math.max(0, offset - 30))}>Предыдущие</button>}
            {offset + 30 < result.total && <button className="secondary" onClick={() => open('admin', offset + 30)}>Следующие</button>}
          </div>
        </section>}
    </>}
  </>;
}

function Analytics({ days }: { days: Daily[] }) {
  const [period, setPeriod] = useState(7);
  const interval = days.slice(0, period);
  function count(prefix: 'view' | 'action', key: string) {
    return interval.reduce((sum, day) => sum + (day.events[`${prefix}:${key}` as GuideEvent] ?? 0), 0);
  }
  return <>
    <section className="card">
      <h2>Активность в Telegram</h2>
      <div className="choiceBar themeChoices" role="group" aria-label="Период отчёта">
        {[7, 30].map(value => <button key={value} type="button" aria-pressed={period === value}
          onClick={() => setPeriod(value)}>{value} дней</button>)}
      </div>
      <p className="caption">Дни по UTC. Повтор одного действия в течение 15 минут учитывается один раз.</p>
      <dl className="analyticsRows">
        {interval.map(day => <div key={day.day}>
          <dt>{dayLabel.format(new Date(day.day))}</dt><dd>{number.format(day.active)} чел.</dd>
        </div>)}
      </dl>
    </section>
    <section className="card"><h2>Открытия разделов</h2><dl className="analyticsRows">
      {Object.entries(guidePages).sort(([a], [b]) => count('view', b) - count('view', a)).map(([key, label]) =>
        <div key={key}><dt>{label}</dt><dd>{number.format(count('view', key))}</dd></div>)}
    </dl></section>
    <section className="card"><h2>Действия</h2><dl className="analyticsRows">
      {Object.entries(guideActions).map(([key, label]) =>
        <div key={key}><dt>{label}</dt><dd>{number.format(count('action', key))}</dd></div>)}
    </dl></section>
  </>;
}
