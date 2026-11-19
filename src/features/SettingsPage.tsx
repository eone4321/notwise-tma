import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { guideAchievements, type GuideAchievement } from '../domain/guide-achievements';
import { AwardIcon } from './GuideAwards';
import { GameGlyph } from '../ui/GameGlyph';
import { Appearance } from './Appearance';
import { SupportPage } from './SupportPage';
import { authData, profileRequest, type GuideProfile } from './guideProfile';
import { useGuideLocale } from './guideLocale';

const scopeLabels = {
  genesis: ['Совы NOT Wise', 'NOT Wise Owls'],
  skins: ['Скины', 'Skins'],
  items: ['Предметы', 'Items'],
  albums: ['Альбомы стикеров', 'Sticker albums'],
} as const;
type Scope = keyof typeof scopeLabels;
type Notifications = { ready: boolean; extraAvailable: boolean; enabled: Record<Scope, boolean> };
const bot = 'https://t.me/NotWiseGuideBot';

export function SettingsPage({ profile, earned }: { profile: GuideProfile | null; earned: GuideAchievement[] }) {
  const { pathname } = useLocation();
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
      {tabs.map(([to, label, glyph]) => <NavLink key={to} end replace to={to}><GameGlyph name={glyph}/>{label}</NavLink>)}
    </nav>
    {pathname === '/support' && <div className="settingsContent" lang="ru"><SupportPage isAdmin={profile?.isAdmin === true}/></div>}
    {pathname === '/support/settings' && <div className="settingsContent">
      <Appearance english={en}/>
      <section className="card">
        <h2>{en ? 'Interface language' : 'Язык интерфейса'}</h2>
        <div className="choiceBar themeChoices" role="group" aria-label={en ? 'Language' : 'Язык'}>
          <button aria-pressed={language.choice === 'auto'} onClick={() => language.setChoice('auto')}>
            {en ? 'Auto' : 'Авто'} · {language.detected.toUpperCase()}
          </button>
          <button aria-pressed={language.choice === 'ru'} onClick={() => language.setChoice('ru')}>Русский</button>
          <button aria-pressed={language.choice === 'en'} onClick={() => language.setChoice('en')}>English</button>
        </div>
        <p className="caption">{en ? 'Game guides are currently available in Russian.' : 'Материалы по игре пока доступны на русском.'}</p>
      </section>
      <NotificationSettings english={en}/>
    </div>}
    {pathname === '/support/achievements' && <Achievements earned={earned}/>}
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

  return <section className="card">
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

function Achievements({ earned }: { earned: GuideAchievement[] }) {
  const total = Object.keys(guideAchievements).length;
  return <section className="card awardCollection" lang="ru">
    <div className="progressCounts"><h2>Достижения гайда</h2><span>{earned.length}/{total}</span></div>
    <progress className="gameProgress" value={earned.length} max={total} aria-label="Открыто достижений"/>
    {!authData() && <p className="caption">Открой гайд в Telegram, чтобы сохранять достижения.</p>}
    <ul className="compactList">{Object.entries(guideAchievements).map(([id, item]) => {
      const done = earned.includes(id as GuideAchievement);
      return <li className="awardRow" key={id} data-earned={done}>
        <span className="awardTile">{done ? <AwardIcon award={id as GuideAchievement} size={34}/> : <GameGlyph name="lock"/>}</span>
        <div><strong>{item.title}</strong><small>{item.description}</small></div>
        {done && <span className="awardMark" aria-label="Открыто">✓</span>}
        {!done && <span className="sr-only">Скрытое достижение</span>}
      </li>;
    })}</ul>
  </section>;
}
