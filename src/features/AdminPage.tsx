import { AwardIcon } from './GuideAwards';
import { guideAchievements, type GuideAchievement } from '../domain/guide-achievements';
import { useEffect, useState } from 'react';
import { guideActions, guideBuilds, guidePages, type GuideEvent } from '../domain/guide-events';
import { authData, profileRequest, type GuideMember } from './guideProfile';
import { collectionMarket, itemMarket, tokenMarket } from './marketData';
import { saveHomeOwlSkin } from './skinRig';
import { useGuideLocale } from './guideLocale';

const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
const dateEn = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const timeOnly = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dayLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayLabelEn = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
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
type Tab = 'analytics' | 'award_stats' | 'admin' | 'market_status' | 'reset';

const guideAchievementsEn: Record<GuideAchievement, string> = {
  mascot: 'Who’s there?',
  explorer: 'Know every corner',
  referral: 'Own route',
  shared: 'Pass it on',
  five: 'Own flock',
  community: 'One of the chat',
  squad: 'Under one wing',
  theme: 'Molting season',
  joke: 'Price of curiosity',
};

const guidePagesEn: Record<keyof typeof guidePages, string> = {
  home: 'Home',
  squads: 'Squads & Wars',
  secrets: 'Secrets',
  capsules: 'Capsules',
  care: 'Cheat Sheet',
  modes: 'Game Modes',
  owl: 'Eggs & Skins',
  collections: 'Collections',
  combat: 'Combat & Skills',
  assets: 'Items',
  ecosystem: 'Ecosystem',
  referrals: 'Invite Friends',
  support: 'Settings',
};

const guideActionsEn: Record<keyof typeof guideActions, string> = {
  game: 'Opened game link',
  channel: 'Opened channel link',
  share_copy: 'Copied guide link',
  chat: 'Opened chat link',
  squad: 'Opened squad link',
  builds: 'Tapped "Build" on home',
  share_send: 'Opened share picker',
};

const guideBuildsEn: Record<keyof typeof guideBuilds, string> = {
  open: 'Opened build calculator',
  preset: 'Applied build preset',
  edit: 'Edited stats & gear',
  analyze: 'Opened build analysis',
  practice: 'Ran practice fights',
  share: 'Shared build',
};

export function AdminPage({ profile }: { profile: { isAdmin: boolean } | null }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const dateFmt = en ? dateEn : date;
  const [tab, setTab] = useState<Tab>('analytics');
  const [result, setResult] = useState<Members | Report | Awards | MarketStatus | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const [testIndex, setTestIndex] = useState(0);
  const canAccess = Boolean(authData()) && profile?.isAdmin !== false;

  useEffect(() => {
    if (!canAccess || tab === 'reset') return;
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
    <h1 className="pageTitle">{en ? 'Guide Admin' : 'Управление гайдом'}</h1>
    {!canAccess || error === 'forbidden' ? <section className="card"><p>{en ? 'This section is available to the project owner in Telegram.' : 'Раздел доступен владельцу проекта в Telegram.'}</p></section> : <>
      <nav className="choiceBar" aria-label={en ? 'Guide Admin' : 'Управление гайдом'}>
        <button aria-pressed={tab === 'analytics'} onClick={() => open('analytics')}>{en ? 'Analytics' : 'Аналитика'}</button>
        <button aria-pressed={tab === 'market_status'} onClick={() => open('market_status')}>{en ? 'Price Parser' : 'Парсер цен'}</button>
        <button aria-pressed={tab === 'award_stats'} onClick={() => open('award_stats')}>{en ? 'Achievements' : 'Достижения'}</button>
        <button aria-pressed={tab === 'admin'} onClick={() => open('admin')}>{en ? 'Users' : 'Пользователи'}</button>
        <button aria-pressed={tab === 'reset'} onClick={() => open('reset')}>{en ? 'Reset' : 'Сброс'}</button>
      </nav>
      {tab === 'reset' ? <AdminResetPanel en={en}/> : error ? <section className="card"><p>{en ? 'Failed to load data.' : 'Не удалось загрузить данные.'}</p>
        <button className="secondary" onClick={() => { setError(''); setAttempt(value => value + 1); }}>{en ? 'Retry' : 'Повторить'}</button>
      </section> : !result ? <section className="card"><p role="status">{en ? 'Loading data…' : 'Загружаем данные…'}</p></section> :
        'days' in result ? <Analytics days={result.days} en={en}/> :
        'collections' in result ? <MarketDiagnostics data={result} refreshing={refreshingMarket} onRefresh={() => void refreshParser()} en={en}/> :
        !('total' in result) ?
        <section className="card awardCollection"><h2>{en ? 'Players with achievements' : 'Игроки с достижением'}</h2>
          <button className="secondary" type="button" onClick={() => {
            const keys = Object.keys(guideAchievements) as GuideAchievement[];
            const next = keys[testIndex % keys.length];
            setTestIndex(value => value + 1);
            window.dispatchEvent(new CustomEvent('guide-award-test', { detail: next }));
          }}>{en ? 'Test notification' : 'Тестовое уведомление'}</button>
          <ul className="compactList">{result.items.filter(({ id }) => Object.hasOwn(guideAchievements, id)).map(({ id, count, rule }) =>
            <li className="awardRow adminAward" key={id}>
              <AwardIcon award={id}/><div><strong>{en ? guideAchievementsEn[id] : guideAchievements[id].title}</strong><small>{rule}</small></div>
              <span aria-label={en ? `Players: ${number.format(count)}` : `Игроков: ${number.format(count)}`}>{number.format(count)}</span>
            </li>)}</ul>
        </section> :
        <section className="card">
          <h2>{en ? `Users · ${number.format(result.total)}` : `Пользователи · ${number.format(result.total)}`}</h2>
          <ul className="compactList">{result.items.map(member => <li className="mediaRow" key={member.id}>
            <div><strong>{member.name}</strong><small className="block">Telegram ID {member.id}</small>
              <small className="block">{en ? `First visit: ${dateFmt.format(member.joinedAt)} · Last visit: ${dateFmt.format(member.seenAt)}` : `Первый вход: ${dateFmt.format(member.joinedAt)} · Последний вход: ${dateFmt.format(member.seenAt)}`}</small>
            </div>
          </li>)}</ul>
          <div className="actionPair">
            {offset > 0 && <button className="secondary" onClick={() => open('admin', Math.max(0, offset - 30))}>{en ? 'Previous' : 'Предыдущие'}</button>}
            {offset + 30 < result.total && <button className="secondary" onClick={() => open('admin', offset + 30)}>{en ? 'Next' : 'Следующие'}</button>}
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

const sourceLabelEn: Record<string, string> = {
  'getgems-web': 'Getgems storefront',
  'basic-info': 'basic-info (fallback)',
  getgems: 'Getgems API',
  toncenter: 'TonCenter v3',
  'getgems-on-chain': 'TonAPI (fallback)',
};

const itemStatusLabel: Record<MarketStatus['items']['status'], string> = {
  ready: 'Актуально',
  stale: 'Устарело',
  unavailable: 'Недоступно',
};

const itemStatusLabelEn: Record<MarketStatus['items']['status'], string> = {
  ready: 'Fresh',
  stale: 'Stale',
  unavailable: 'Unavailable',
};

function formatAge(timestamp: number | string | null, en = false) {
  const ms = typeof timestamp === 'number' ? timestamp : timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(ms)) return '—';
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  const ago = mins === 0 ? (en ? 'just now' : 'только что') : (en ? `${mins}m ago` : `${mins} мин назад`);
  return `${timeOnly.format(ms)} (${ago})`;
}

function MarketDiagnostics({ data, refreshing, onRefresh, en }: {
  data: MarketStatus; refreshing: boolean; onRefresh: () => void; en: boolean;
}) {
  const { data: tokens } = tokenMarket.useSnapshot();
  const mainCols = data.collections.filter(col => !col.id.startsWith('album-'));
  const albumCols = data.collections.filter(col => col.id.startsWith('album-'));
  const okCount = data.collections.filter(col => col.available).length;
  const webCount = data.collections.filter(col => col.available && col.source === 'getgems-web').length;
  const fallbackCount = data.collections.filter(col => col.available && col.source === 'basic-info').length;
  const failedCount = data.collections.length - okCount;
  const healthy = data.fresh && failedCount === 0 && fallbackCount === 0 && data.items.status === 'ready';
  const srcLabels = en ? sourceLabelEn : sourceLabel;
  const statusLabels = en ? itemStatusLabelEn : itemStatusLabel;

  return <>
    <section className="card">
      <h2>{en ? 'Parser status' : 'Состояние парсера'}</h2>
      <p className="caption">
        {healthy
          ? (en ? 'All sources are operating normally.' : 'Все источники работают штатно.')
          : (en ? 'Some sources have delays, fallbacks, or refresh errors.' : 'Есть задержки, резервный источник или ошибки обновления.')}{' '}
        {en ? `Schedule — every ${data.intervalMinutes} min.` : `Расписание — каждые ${data.intervalMinutes} мин.`}
      </p>
      <button className="primary" type="button" disabled={refreshing} onClick={onRefresh}>
        {refreshing ? (en ? 'Running parser…' : 'Запускаем парсер…') : (en ? 'Refresh prices now' : 'Обновить цены сейчас')}
      </button>
      {data.throttled && <p className="supportStatus" role="status">{en ? 'Manual refresh is rate-limited to once every 10 seconds — showing latest snapshot.' : 'Повторный запуск доступен раз в 10 секунд — показан последний снимок.'}</p>}
      {data.refreshSummary && !data.throttled && <p className="supportStatus" role="status">
        {en
          ? `Parser refreshed: ${data.refreshSummary.collections}/${data.refreshSummary.total} collections, ${data.refreshSummary.itemTypes} item types.`
          : `Парсер обновлён: ${data.refreshSummary.collections}/${data.refreshSummary.total} коллекций, ${data.refreshSummary.itemTypes} типов предметов.`}
      </p>}
      <dl className="analyticsRows">
        <div><dt>{en ? 'Snapshot status' : 'Статус снимка'}</dt><dd>{data.fresh ? (en ? 'Fresh' : 'Актуальный') : (en ? 'Stale' : 'Устарел')}</dd></div>
        <div><dt>{en ? 'Last run' : 'Последний прогон'}</dt><dd>{formatAge(data.attemptedAt, en)}</dd></div>
        <div><dt>{en ? 'Collections (updated / total)' : 'Коллекции (обновлены / всего)'}</dt><dd>{okCount} / {data.collections.length}</dd></div>
        {webCount > 0 && <div><dt>{en ? 'From Getgems storefront' : 'С витрины Getgems'}</dt><dd>{webCount}</dd></div>}
        {fallbackCount > 0 && <div><dt>{en ? 'On fallback (basic-info)' : 'На резерве (basic-info)'}</dt><dd>{fallbackCount}</dd></div>}
        {failedCount > 0 && <div><dt>{en ? 'Failed to update' : 'Не обновились'}</dt><dd>{failedCount}</dd></div>}
        <div><dt>{en ? 'Items (NOT Wise: Items)' : 'Предметы (NOT Wise: Items)'}</dt><dd>{statusLabels[data.items.status]} · {data.items.items.length} {en ? 'types' : 'типов'}</dd></div>
        <div><dt>{en ? 'Items source' : 'Источник предметов'}</dt><dd>{data.items.source ? (srcLabels[data.items.source] ?? data.items.source) : '—'}</dd></div>
        <div><dt>{en ? 'Items updated' : 'Обновление предметов'}</dt><dd>{formatAge(data.items.updatedAt, en)}</dd></div>
      </dl>
    </section>

    <section className="card">
      <h2>{en ? `Core collections (${mainCols.length})` : `Основные коллекции (${mainCols.length})`}</h2>
      <dl className="analyticsRows">
        {mainCols.map(col => <div key={col.id}>
          <dt>
            {col.name}
            <small className="block">
              {col.available ? (col.source ? srcLabels[col.source] : (en ? 'ok' : 'ок')) : (en ? 'unavailable' : 'недоступно')}
              {typeof col.supply === 'number' ? (en ? ` · ${number.format(col.supply)} pcs` : ` · ${number.format(col.supply)} шт.`) : ''}
            </small>
          </dt>
          <dd>{col.floor !== null ? `${number.format(col.floor)} GRAM` : '—'}</dd>
        </div>)}
      </dl>
    </section>

    <details className="card mediaDetails">
      <summary><span><strong>{en ? `Sticker albums (${albumCols.length})` : `Альбомы стикеров (${albumCols.length})`}</strong><small>{en ? `With floor: ${albumCols.filter(col => col.floor !== null).length}` : `С флором: ${albumCols.filter(col => col.floor !== null).length}`}</small></span></summary>
      <dl className="analyticsRows">
        {albumCols.map(col => <div key={col.id}>
          <dt>
            {en ? `Album #${col.id.slice(6)}` : `Альбом №${col.id.slice(6)}`}
            <small className="block">
              {col.available ? (col.source ? srcLabels[col.source] : (en ? 'ok' : 'ок')) : (en ? 'unavailable' : 'недоступно')}
              {typeof col.supply === 'number' ? (en ? ` · minted ${number.format(col.supply)}` : ` · сминчено ${number.format(col.supply)}`) : ''}
            </small>
          </dt>
          <dd>{col.floor !== null ? `${number.format(col.floor)} GRAM` : '—'}</dd>
        </div>)}
      </dl>
    </details>

    <details className="card mediaDetails">
      <summary><span><strong>{en ? `Item floors (${data.items.items.length})` : `Флоры предметов (${data.items.items.length})`}</strong><small>{en ? 'Source' : 'Источник'}: {data.items.source ? (srcLabels[data.items.source] ?? data.items.source) : '—'}</small></span></summary>
      <dl className="analyticsRows">
        {data.items.items.map(item => <div key={item.id}>
          <dt>{item.id}</dt>
          <dd>{number.format(item.floor)} GRAM</dd>
        </div>)}
      </dl>
    </details>

    {tokens && <section className="card">
      <h2>{en ? 'Token rates' : 'Курсы токенов'}</h2>
      <dl className="analyticsRows">
        {tokens.items.map(token => <div key={token.symbol}>
          <dt>{token.symbol}<small className="block">{token.status === 'fresh' ? (en ? 'Fresh' : 'Свежий') : token.status === 'stale' ? (en ? 'Cached' : 'Кэш') : (en ? 'Unavailable' : 'Недоступен')} · {formatAge(token.fetchedAt, en)}</small></dt>
          <dd>{token.priceUsd ? `$${Number(token.priceUsd).toPrecision(4)}` : '—'}</dd>
        </div>)}
      </dl>
    </section>}
  </>;
}

function Analytics({ days, en }: { days: Daily[]; en: boolean }) {
  const [period, setPeriod] = useState(7);
  const interval = days.slice(0, period);
  const dayFmt = en ? dayLabelEn : dayLabel;
  const buildsMap = en ? guideBuildsEn : guideBuilds;
  const pagesMap = en ? guidePagesEn : guidePages;
  const actionsMap = en ? guideActionsEn : guideActions;
  function count(prefix: 'view' | 'action' | 'build', key: string) {
    return interval.reduce((sum, day) => sum + (day.events[`${prefix}:${key}` as GuideEvent] ?? 0), 0);
  }
  return <>
    <section className="card">
      <h2>{en ? 'Telegram activity' : 'Активность в Telegram'}</h2>
      <div className="choiceBar themeChoices" role="group" aria-label={en ? 'Report period' : 'Период отчёта'}>
        {[7, 30].map(value => <button key={value} type="button" aria-pressed={period === value}
          onClick={() => setPeriod(value)}>{en ? `${value} days` : `${value} дней`}</button>)}
      </div>
      <p className="caption">{en ? 'UTC days. Repeated identical actions within 15 minutes are counted once.' : 'Дни по UTC. Повтор одного действия в течение 15 минут учитывается один раз.'}</p>
      <dl className="analyticsRows">
        {interval.map(day => <div key={day.day}>
          <dt>{dayFmt.format(new Date(day.day))}</dt><dd>{number.format(day.active)} {en ? 'users' : 'чел.'}</dd>
        </div>)}
      </dl>
    </section>
    <section className="card"><h2>{en ? 'Build calculator' : 'Конструктор билдов'}</h2><dl className="analyticsRows">
      {Object.entries(buildsMap).map(([key, label]) =>
        <div key={key}><dt>{label}</dt><dd>{number.format(count('build', key))}</dd></div>)}
    </dl></section>
    <section className="card"><h2>{en ? 'Section views' : 'Открытия разделов'}</h2><dl className="analyticsRows">
      {Object.entries(pagesMap).sort(([a], [b]) => count('view', b) - count('view', a)).map(([key, label]) =>
        <div key={key}><dt>{label}</dt><dd>{number.format(count('view', key))}</dd></div>)}
    </dl></section>
    <section className="card"><h2>{en ? 'Actions' : 'Действия'}</h2><dl className="analyticsRows">
      {Object.entries(actionsMap).map(([key, label]) =>
        <div key={key}><dt>{label}</dt><dd>{number.format(count('action', key))}</dd></div>)}
    </dl></section>
  </>;
}


type ResetTargetId = 'onboarding' | 'home_owl' | 'skin_calc' | 'build_calc' | 'secrets' | 'market_cache' | 'appearance' | 'views';

const resetOptions: { id: ResetTargetId; title: string; titleEn: string; desc: string; descEn: string }[] = [
  { id: 'onboarding', title: 'Онбординг', titleEn: 'Onboarding', desc: 'Подсказки навигации и выбора темы при первом входе', descEn: 'Navigation and theme tooltips shown on first visit' },
  { id: 'home_owl', title: 'Сова на обложке', titleEn: 'Cover owl skin', desc: 'Сброс выбранного скина на главном экране (локально и в CloudStorage)', descEn: 'Reset selected owl skin on the home cover (local & CloudStorage)' },
  { id: 'skin_calc', title: 'Калькулятор скинов', titleEn: 'Skin calculator', desc: 'Выбранные детали, заточка и пресет', descEn: 'Selected skin parts, enchant levels, and preset' },
  { id: 'build_calc', title: 'Калькулятор билдов', titleEn: 'Build calculator', desc: 'Сохранённые статы, кольца, навыки и фильтры', descEn: 'Saved stats, rings, skills, and filters' },
  { id: 'secrets', title: 'Секреты (окно 1 ⭐)', titleEn: 'Secrets (1 ⭐ modal)', desc: 'Снова покажет шутку с оплатой 1 ⭐ при открытии секретов', descEn: 'Re-show the 1 ⭐ joke prompt when opening Secrets' },
  { id: 'market_cache', title: 'Кэш маркета и графиков', titleEn: 'Market & chart cache', desc: 'Локально закэшированные флоры, лоты и курсы токенов', descEn: 'Locally cached floor prices, listings, and token rates' },
  { id: 'appearance', title: 'Тема и язык', titleEn: 'Theme & language', desc: 'Сброс темы оформления и языка интерфейса', descEn: 'Reset theme and interface language preference' },
  { id: 'views', title: 'Позиции скролла', titleEn: 'Scroll positions', desc: 'Запомненные позиции прокрутки и раскрытые списки', descEn: 'Saved scroll positions and expanded sections' },
];

function removeMatchingKeys(storage: Storage, test: (key: string) => boolean) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && test(k)) keys.push(k);
  }
  for (const k of keys) storage.removeItem(k);
}

function AdminResetPanel({ en }: { en: boolean }) {
  const [selected, setSelected] = useState<Set<ResetTargetId>>(() => new Set(['onboarding']));
  const [status, setStatus] = useState('');

  const toggle = (id: ResetTargetId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = selected.size === resetOptions.length;

  function applyReset() {
    if (selected.size === 0) return;
    try {
      if (selected.has('onboarding')) {
        localStorage.removeItem('notwise.guide.dock.v1');
        localStorage.removeItem('notwise.guide.theme-tip.v1');
      }
      if (selected.has('home_owl')) {
        saveHomeOwlSkin(null);
      }
      if (selected.has('skin_calc')) {
        removeMatchingKeys(localStorage, k => k.startsWith('notwise.guide.skin-calc'));
        removeMatchingKeys(sessionStorage, k => k.startsWith('notwise.guide.skin-calc'));
      }
      if (selected.has('build_calc')) {
        removeMatchingKeys(localStorage, k => k.startsWith('notwise.guide.combat-build') || k.startsWith('notwise.guide.builds.'));
        removeMatchingKeys(sessionStorage, k => k.startsWith('notwise.guide.combat-build') || k.startsWith('notwise.guide.builds.'));
      }
      if (selected.has('secrets')) {
        localStorage.removeItem('notwise.guide.secrets.v1');
        sessionStorage.removeItem('notwise.guide.secrets.v1');
      }
      if (selected.has('market_cache')) {
        removeMatchingKeys(localStorage, k => k.startsWith('notwise.market.'));
      }
      if (selected.has('appearance')) {
        localStorage.removeItem('notwise.guide.theme');
        localStorage.removeItem('notwise.guide.language');
      }
      if (selected.has('views')) {
        removeMatchingKeys(sessionStorage, k => k.startsWith('notwise.guide.views.'));
      }
      setStatus(en ? 'Selected data reset — reloading…' : 'Выбранные данные сброшены — перезагружаем…');
      window.setTimeout(() => window.location.reload(), 450);
    } catch {
      setStatus(en ? 'Could not clear some data.' : 'Не удалось очистить часть данных.');
    }
  }

  return (
    <section className="card adminResetCard">
      <div className="adminResetHead">
        <div>
          <h2>{en ? 'Selective reset' : 'Выборочный сброс'}</h2>
          <p className="caption" style={{ margin: 0 }}>{en ? 'Select the items you want to reset on your device.' : 'Отметь пункты, которые нужно сбросить на твоём устройстве.'}</p>
        </div>
        <button
          type="button"
          className="secondary adminResetToggleAll"
          onClick={() => setSelected(allSelected ? new Set() : new Set(resetOptions.map(o => o.id)))}
        >
          {allSelected ? (en ? 'Deselect all' : 'Снять всё') : (en ? 'Select all' : 'Выбрать всё')}
        </button>
      </div>

      <div className="adminResetList">
        {resetOptions.map(opt => (
          <label className="adminResetRow" key={opt.id}>
            <input
              type="checkbox"
              checked={selected.has(opt.id)}
              onChange={() => toggle(opt.id)}
            />
            <span>
              <strong>{en ? opt.titleEn : opt.title}</strong>
              <small>{en ? opt.descEn : opt.desc}</small>
            </span>
          </label>
        ))}
      </div>

      <button
        type="button"
        className="primary"
        disabled={selected.size === 0}
        onClick={applyReset}
      >
        {en ? `Reset selected (${selected.size})` : `Сбросить выбранное (${selected.size})`}
      </button>
      {status && <p className="supportStatus" role="status">{status}</p>}
    </section>
  );
}
