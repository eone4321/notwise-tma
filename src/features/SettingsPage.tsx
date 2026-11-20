import { useEffect, useState } from 'react';
import { Navigate, NavLink, useLocation } from 'react-router';
import { guideAchievements, type GuideAchievement } from '../domain/guide-achievements';
import { AwardIcon } from './GuideAwards';
import { GameGlyph } from '../ui/GameGlyph';
import { Appearance } from './Appearance';
import { SupportPage } from './SupportPage';
import { authData, profileRequest, type GuideProfile } from './guideProfile';
import { useGuideLocale } from './guideLocale';
import { saveHomeOwlSkin } from './skinRig';

const scopeLabels = {
  genesis: ['Совы NOT Wise', 'NOT Wise Owls'],
  skins: ['Скины', 'Skins'],
  items: ['Предметы', 'Items'],
  albums: ['Альбомы стикеров', 'Sticker albums'],
} as const;
type Scope = keyof typeof scopeLabels;
type Notifications = { ready: boolean; extraAvailable: boolean; enabled: Record<Scope, boolean> };
const bot = 'https://t.me/NotWiseGuideBot';

const guideAchievementsEn: Record<GuideAchievement, { title: string; description: string }> = {
  mascot: { title: 'Who’s there?', description: 'You don’t stumble across this by accident. Almost.' },
  explorer: { title: 'Know every corner', description: 'Curiosity leads beyond familiar paths.' },
  referral: { title: 'Own route', description: 'Every trail leaves its own mark.' },
  shared: { title: 'Pass it on', description: 'Good finds rarely stay with just one person.' },
  five: { title: 'Own flock', description: 'Nobody flies here solo anymore.' },
  community: { title: 'One of the chat', description: 'Sometimes one step is enough to be among your own.' },
  squad: { title: 'Under one wing', description: 'A strong flock always has a banner to rally around.' },
  theme: { title: 'Molting season', description: 'Sometimes the world around changes with a single decision.' },
  joke: { title: 'Price of curiosity', description: 'Not everything that asks for payment actually costs money.' },
};

export function SettingsPage({ profile, earned, chatIssue }: { profile: GuideProfile | null; earned: GuideAchievement[]; chatIssue?: string }) {
  const { pathname, state } = useLocation();
  const isKnownTab = pathname === '/support' || pathname === '/support/settings' || pathname === '/support/achievements';
  if (!isKnownTab) {
    return <Navigate to="/support" state={state} replace/>;
  }
  const keepParent = state?.guideDetail === true;
  const language = useGuideLocale(profile?.language);
  const en = language.locale === 'en';
  const tabs = [
    ['/support', en ? 'About' : 'О проекте', 'info'],
    ['/support/settings', en ? 'Settings' : 'Настройки', 'settings'],
    ['/support/achievements', en ? 'Achievements' : 'Достижения', 'treasure'],
  ] as const;
  return <>
    <h1 className="pageTitle">{en ? 'Settings' : 'Настройки'}</h1>
    <nav className="choiceBar profileTabs settingsTabs" aria-label={en ? 'Guide settings' : 'Настройки гайда'}>
      {tabs.map(([to, label, glyph]) => <NavLink key={to} end replace state={keepParent ? { guideDetail: true } : undefined} to={to}><GameGlyph name={glyph}/>{label}</NavLink>)}
    </nav>
    {pathname === '/support' && <div className="settingsContent"><SupportPage isAdmin={profile?.isAdmin === true}/></div>}
    {pathname === '/support/settings' && <div className="settingsContent">
      <Appearance english={en}/>
      <section className="card settingsGroup">
        <h2>{en ? 'Interface language' : 'Язык интерфейса'}</h2>
        <div className="choiceBar themeChoices" role="group" aria-label={en ? 'Language' : 'Язык'}>
          <button aria-pressed={language.choice === 'auto'} onClick={() => language.setChoice('auto')}>
            {en ? 'Auto' : 'Авто'} · {language.detected.toUpperCase()}
          </button>
          <button aria-pressed={language.choice === 'ru'} onClick={() => language.setChoice('ru')}>Русский</button>
          <button aria-pressed={language.choice === 'en'} onClick={() => language.setChoice('en')}>English</button>
        </div>
        <p className="caption">{en ? 'Interface and game guides are available in Russian and English.' : 'Интерфейс и материалы гайда доступны на русском и английском.'}</p>
      </section>
      <NotificationSettings english={en}/>
      <ResetAccountSettings english={en}/>
      <section className="card settingsVersionCard" aria-label={en ? 'Guide version' : 'Версия гайда'}>
        <span className="settingsVersionLabel">NOT Wise Guide</span>
        <span className="settingsVersionBadge">1.2</span>
      </section>
    </div>}
    {pathname === '/support/achievements' && <Achievements earned={earned} isAdmin={profile?.isAdmin === true} chatIssue={chatIssue} english={en}/>}
  </>;
}

function NotificationSettings({ english: en }: { english: boolean }) {
  const [state, setState] = useState<Notifications>();
  const [busy, setBusy] = useState<Scope>();
  const [error, setError] = useState(false);
  const [attempt, retry] = useState(0);
  const secure = Boolean(authData());
  useEffect(() => {
    if (!secure) return;
    const abort = new AbortController();
    profileRequest<Notifications>({ action: 'notifications' }, abort.signal).then(setState).catch(() => {
      if (!abort.signal.aborted) setError(true);
    });
    return () => abort.abort();
  }, [secure, attempt]);

  async function change(scope: Scope, enabled: boolean) {
    setError(false);
    setBusy(scope);
    try { setState(await profileRequest<Notifications>({ action: 'notifications', scope, enabled })); }
    catch { setError(true); }
    finally { setBusy(undefined); }
  }

  return <section className="card settingsGroup">
    <h2>{en ? 'Sale notifications' : 'Уведомления о продажах'}</h2>
    <p>{en ? 'The guide bot sends completed Getgems sales.' : 'Бот гайда присылает состоявшиеся продажи на Getgems.'}</p>
    {(!secure || (state && !state.ready)) && <a className="secondary" href={bot}>{en ? 'Start the bot' : 'Запустить бота'}</a>}
    {!secure && <p className="caption">{en ? 'Open the guide in Telegram to change these settings.' : 'Для выбора уведомлений открой гайд в Telegram.'}</p>}
    {secure && !state && !error && <p className="caption" role="status">{en ? 'Loading…' : 'Загружаем…'}</p>}
    {state && (Object.keys(scopeLabels) as Scope[]).map(scope => <label className="settingsRow" key={scope}>
      <span>{scopeLabels[scope][Number(en)]}
        {scope !== 'genesis' && !state.extraAvailable && <small>{en ? 'Coming soon' : 'Скоро'}</small>}</span>
      <input type="checkbox" role="switch" checked={state.enabled[scope]}
        disabled={!!busy || (scope !== 'genesis' && !state.extraAvailable)}
        onChange={event => void change(scope, event.currentTarget.checked)}/>
    </label>)}
    {error && <div><p role="status">{en ? 'Settings are unavailable.' : 'Настройки временно недоступны.'}</p>
      <button className="secondary" onClick={() => { setError(false); retry(value => value + 1); }}>{en ? 'Retry' : 'Повторить'}</button></div>}
  </section>;
}

function Achievements({ earned, isAdmin, chatIssue, english: en }: { earned: GuideAchievement[]; isAdmin: boolean; chatIssue?: string; english: boolean }) {
  const total = Object.keys(guideAchievements).length;
  const hasCommunity = earned.includes('community');
  useEffect(() => {
    if (authData() && !hasCommunity) {
      window.dispatchEvent(new Event('guide-awards-check-chat'));
    }
  }, [hasCommunity]);
  return <section className="card awardCollection">
    <div className="progressCounts"><h2>{en ? 'Guide achievements' : 'Достижения гайда'}</h2><span>{earned.length}/{total}</span></div>
    <progress className="gameProgress" value={earned.length} max={total} aria-label={en ? 'Unlocked achievements' : 'Открыто достижений'}/>
    {!authData() && <p className="caption">{en ? 'Open the guide in Telegram to save your achievements.' : 'Открой гайд в Telegram, чтобы сохранять достижения.'}</p>}
    {isAdmin && chatIssue && !hasCommunity && <p className="caption">
      {chatIssue === 'no_chat'
        ? (en
          ? 'Chat check for "One of the chat" is not configured: set GUIDE_CHAT_ID or link a discussion chat to the channel.'
          : 'Проверка чата для «Свой в чате» не настроена: укажи GUIDE_CHAT_ID или привяжи чат обсуждений к каналу.')
        : (en
          ? 'To verify "One of the chat", add @NotWiseGuideBot to the CryptoOne chat with access to the member list.'
          : 'Для проверки «Свой в чате» добавь @NotWiseGuideBot в чат CryptoOne (нужен доступ к списку участников).')}
    </p>}
    <ul className="compactList">{Object.entries(guideAchievements).map(([id, item]) => {
      const awardId = id as GuideAchievement;
      const done = earned.includes(awardId);
      const copy = en ? guideAchievementsEn[awardId] : item;
      return <li className="awardRow" key={id} data-earned={done}>
        <span className="awardTile">{done ? <AwardIcon award={awardId} size={28}/> : <GameGlyph name="lock"/>}</span>
        <div><strong>{copy.title}</strong><small>{copy.description}</small></div>
        {done && <span className="awardMark" aria-label={en ? 'Unlocked' : 'Открыто'}>✓</span>}
        {!done && <span className="sr-only">{en ? 'Hidden achievement' : 'Скрытое достижение'}</span>}
      </li>;
    })}</ul>
  </section>;
}

function clearGuideStorage(storage: Storage) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith('notwise.guide.')) keys.push(key);
  }
  for (const key of keys) {
    try { storage.removeItem(key); } catch { /* ignore */ }
  }
}

function ResetAccountSettings({ english: en }: { english: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function runReset() {
    if (busy) return;
    setBusy(true);
    try {
      if (authData()) {
        await profileRequest({ action: 'reset_my_state' }).catch(() => null);
      }
      saveHomeOwlSkin(null);
      clearGuideStorage(localStorage);
      clearGuideStorage(sessionStorage);
      document.documentElement.dataset.theme = 'graphite';
    } finally {
      window.location.replace('/');
    }
  }

  return <section className="card settingsGroup settingsResetCard">
    <h2>{en ? 'Reset guide settings & progress' : 'Сброс настроек и онбординга'}</h2>
    <p className="caption">
      {en
        ? 'Clears onboarding tips, cover owl skin, saved builds, checklists and achievements so the guide opens like the very first time.'
        : 'Сбрасывает онбординг, выбранный скин совы на обложке, сохранённые сборки, отметки стикеров/секретов и достижения гайда — как при первом открытии.'}
    </p>
    {!confirming ? (
      <button type="button" className="secondary settingsResetBtn" onClick={() => setConfirming(true)}>
        {en ? 'Reset everything & restart onboarding' : 'Сбросить всё и показать онбординг заново'}
      </button>
    ) : (
      <div className="settingsResetConfirm">
        <button type="button" className="primary settingsResetDanger" disabled={busy} onClick={() => void runReset()}>
          {busy ? (en ? 'Resetting…' : 'Сбрасываем…') : (en ? 'Yes, reset my data' : 'Да, сбросить всё')}
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => setConfirming(false)}>
          {en ? 'Cancel' : 'Отмена'}
        </button>
      </div>
    )}
  </section>;
}
