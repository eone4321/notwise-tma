import { AwardIcon } from './GuideAwards';
import { guideAchievements, type GuideAchievement } from '../domain/guide-achievements';
import { useEffect, useState } from 'react';
import { guideActions, guideBuilds, guidePages, type GuideEvent } from '../domain/guide-events';
import { authData, profileRequest, type GuideMember } from './guideProfile';
import { collectionMarket, itemMarket, tokenMarket } from './marketData';

const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
const timeOnly = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dayLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });
type Members = { items: GuideMember[]; total: number };
type Daily = { day: string; active: number; events: Partial<Record<GuideEvent, number>> };
type Report = { days: Daily[] };
type Awards = { items: { id: GuideAchievement; count: number; rule: string }[] };
type MarketCollectionStatus = {
  id: string; name: string; floor: number | null; supply: number | null;
  updatedAt: string | null; source: 'getgems-web' | 'basic-info' | null; available: boolean;
};
type MarketStatus = {
  attemptedAt: number | null;
  fresh: boolean;
  intervalMinutes: number;
  collections: MarketCollectionStatus[];
  items: {
    status: 'ready' | 'stale' | 'unavailable';
    source: 'getgems' | 'toncenter' | 'getgems-on-chain' | null;
    updatedAt: string | null;
    items: { id: string; floor: number }[];
  };
  throttled?: boolean;
  refreshSummary?: {
    collections: number;
    total: number;
    itemTypes: number;
    itemsStatus?: string;
    itemSource?: string;
  } | null;
};
type Tab = 'analytics' | 'award_stats' | 'admin' | 'market_status';

export function AdminPage({ profile }: { profile: { isAdmin: boolean } | null }) {
  const [tab, setTab] = useState<Tab>('analytics');
  const [result, setResult] = useState<Members | Report | Awards | MarketStatus | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const canAccess = Boolean(authData()) && profile?.isAdmin !== false;

  useEffect(() => {
    if (!canAccess) return;
    const abort = new AbortController();
    profileRequest<Members | Report | Awards | MarketStatus>({ action: tab, offset }, abort.signal).then(setResult).catch(reason => {
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

  async function refreshParser() {
    setRefreshingMarket(true);
    setError('');
    try {
      const next = await profileRequest<MarketStatus>({ action: 'market_refresh' });
      setResult(next);
      tokenMarket.refresh(true);
      collectionMarket.refresh(true);
      itemMarket.refresh(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'unavailable');
    } finally {
      setRefreshingMarket(false);
    }
  }

  return <>
    <h1 className="pageTitle">Управление гайдом</h1>
    {!canAccess || error === 'forbidden' ? <section className="card"><p>Раздел доступен владельцу проекта в Telegram.</p></section> : <>
      <nav className="choiceBar" aria-label="Управление гайдом">
        <button aria-pressed={tab === 'analytics'} onClick={() => open('analytics')}>Аналитика</button>
        <button aria-pressed={tab === 'market_status'} onClick={() => open('market_status')}>Парсер цен</button>
        <button aria-pressed={tab === 'award_stats'} onClick={() => open('award_stats')}>Достижения</button>
        <button aria-pressed={tab === 'admin'} onClick={() => open('admin')}>Пользователи</button>
      </nav>
      {error ? <section className="card"><p>Не удалось загрузить данные.</p>
        <button className="secondary" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Повторить</button>
      </section> : !result ? <section className="card"><p role="status">Загружаем данные…</p></section> :
        'days' in result ? <Analytics days={result.days}/> :
        'collections' in result ? <MarketDiagnostics data={result} refreshing={refreshingMarket} onRefresh={() => void refreshParser()}/> :
        !('total' in result) ?
        <section className="card awardCollection"><h2>Игроки с достижением</h2>
          <ul className="compactList">{result.items.filter(({ id }) => Object.hasOwn(guideAchievements, id)).map(({ id, count, rule }) =>
            <li className="awardRow adminAward" key={id}>
              <AwardIcon award={id}/><div><strong>{guideAchievements[id].title}</strong><small>{rule}</small></div>
              <span aria-label={`Игроков: ${number.format(count)}`}>{number.format(count)}</span>
            </li>)}</ul>
        </section> :
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

const sourceLabel: Record<string, string> = {
  'getgems-web': 'Getgems витрина',
  'basic-info': 'basic-info (резерв)',
  getgems: 'Getgems API',
  toncenter: 'TonCenter v3',
  'getgems-on-chain': 'TonAPI (резерв)',
};

const itemStatusLabel: Record<MarketStatus['items']['status'], string> = {
  ready: 'Актуально',
  stale: 'Устарело',
  unavailable: 'Недоступно',
};

function formatAge(timestamp: number | string | null) {
  const ms = typeof timestamp === 'number' ? timestamp : timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(ms)) return '—';
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  const ago = mins === 0 ? 'только что' : `${mins} мин назад`;
  return `${timeOnly.format(ms)} (${ago})`;
}

function MarketDiagnostics({ data, refreshing, onRefresh }: {
  data: MarketStatus; refreshing: boolean; onRefresh: () => void;
}) {
  const { data: tokens } = tokenMarket.useSnapshot();
  const mainCols = data.collections.filter(col => !col.id.startsWith('album-'));
  const albumCols = data.collections.filter(col => col.id.startsWith('album-'));
  const okCount = data.collections.filter(col => col.available).length;
  const webCount = data.collections.filter(col => col.available && col.source === 'getgems-web').length;
  const fallbackCount = data.collections.filter(col => col.available && col.source === 'basic-info').length;
  const failedCount = data.collections.length - okCount;
  const healthy = data.fresh && failedCount === 0 && fallbackCount === 0 && data.items.status === 'ready';

  return <>
    <section className="card">
      <h2>Состояние парсера</h2>
      <p className="caption">
        {healthy ? 'Все источники работают штатно.' : 'Есть задержки, резервный источник или ошибки обновления.'} Расписание — каждые {data.intervalMinutes} мин.
      </p>
      <button className="primary" type="button" disabled={refreshing} onClick={onRefresh}>
        {refreshing ? 'Запускаем парсер…' : 'Обновить цены сейчас'}
      </button>
      {data.throttled && <p className="supportStatus" role="status">Повторный запуск доступен раз в 10 секунд — показан последний снимок.</p>}
      {data.refreshSummary && !data.throttled && <p className="supportStatus" role="status">
        Парсер обновлён: {data.refreshSummary.collections}/{data.refreshSummary.total} коллекций, {data.refreshSummary.itemTypes} типов предметов.
      </p>}
      <dl className="analyticsRows">
        <div><dt>Статус снимка</dt><dd>{data.fresh ? 'Актуальный' : 'Устарел'}</dd></div>
        <div><dt>Последний прогон</dt><dd>{formatAge(data.attemptedAt)}</dd></div>
        <div><dt>Коллекции (обновлены / всего)</dt><dd>{okCount} / {data.collections.length}</dd></div>
        {webCount > 0 && <div><dt>С витрины Getgems</dt><dd>{webCount}</dd></div>}
        {fallbackCount > 0 && <div><dt>На резерве (basic-info)</dt><dd>{fallbackCount}</dd></div>}
        {failedCount > 0 && <div><dt>Не обновились</dt><dd>{failedCount}</dd></div>}
        <div><dt>Предметы (NOT Wise: Items)</dt><dd>{itemStatusLabel[data.items.status]} · {data.items.items.length} типов</dd></div>
        <div><dt>Источник предметов</dt><dd>{data.items.source ? (sourceLabel[data.items.source] ?? data.items.source) : '—'}</dd></div>
        <div><dt>Обновление предметов</dt><dd>{formatAge(data.items.updatedAt)}</dd></div>
      </dl>
    </section>

    <section className="card">
      <h2>Основные коллекции ({mainCols.length})</h2>
      <dl className="analyticsRows">
        {mainCols.map(col => <div key={col.id}>
          <dt>
            {col.name}
            <small className="block">
              {col.available ? (col.source ? sourceLabel[col.source] : 'ок') : 'недоступно'}
              {typeof col.supply === 'number' ? ` · ${number.format(col.supply)} шт.` : ''}
            </small>
          </dt>
          <dd>{col.floor !== null ? `${number.format(col.floor)} GRAM` : '—'}</dd>
        </div>)}
      </dl>
    </section>

    <details className="card mediaDetails">
      <summary><span><strong>Альбомы стикеров ({albumCols.length})</strong><small>С флором: {albumCols.filter(col => col.floor !== null).length}</small></span></summary>
      <dl className="analyticsRows">
        {albumCols.map(col => <div key={col.id}>
          <dt>
            Альбом №{col.id.slice(6)}
            <small className="block">
              {col.available ? (col.source ? sourceLabel[col.source] : 'ок') : 'недоступно'}
              {typeof col.supply === 'number' ? ` · сминчено ${number.format(col.supply)}` : ''}
            </small>
          </dt>
          <dd>{col.floor !== null ? `${number.format(col.floor)} GRAM` : '—'}</dd>
        </div>)}
      </dl>
    </details>

    <details className="card mediaDetails">
      <summary><span><strong>Флоры предметов ({data.items.items.length})</strong><small>Источник: {data.items.source ? (sourceLabel[data.items.source] ?? data.items.source) : '—'}</small></span></summary>
      <dl className="analyticsRows">
        {data.items.items.map(item => <div key={item.id}>
          <dt>{item.id}</dt>
          <dd>{number.format(item.floor)} GRAM</dd>
        </div>)}
      </dl>
    </details>

    {tokens && <section className="card">
      <h2>Курсы токенов</h2>
      <dl className="analyticsRows">
        {tokens.items.map(token => <div key={token.symbol}>
          <dt>{token.symbol}<small className="block">{token.status === 'fresh' ? 'Свежий' : token.status === 'stale' ? 'Кэш' : 'Недоступен'} · {formatAge(token.fetchedAt)}</small></dt>
          <dd>{token.priceUsd ? `$${Number(token.priceUsd).toPrecision(4)}` : '—'}</dd>
        </div>)}
      </dl>
    </section>}
  </>;
}

function Analytics({ days }: { days: Daily[] }) {
  const [period, setPeriod] = useState(7);
  const interval = days.slice(0, period);
  function count(prefix: 'view' | 'action' | 'build', key: string) {
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
    <section className="card"><h2>Конструктор билдов</h2><dl className="analyticsRows">
      {Object.entries(guideBuilds).map(([key, label]) =>
        <div key={key}><dt>{label}</dt><dd>{number.format(count('build', key))}</dd></div>)}
    </dl></section>
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
