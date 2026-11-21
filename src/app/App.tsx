import { dockCoachKey, themeCoachKey } from '../domain/onboarding';
import { DetailLink } from '../ui/DetailLink';
import { trackGuide, useGuideAnalytics } from '../features/guideAnalytics';
import { channelInvite, communityChat, squadLink } from '../domain/guide-links';
import { startMarketUpdates } from '../features/marketData';
import { copyLink } from '../ui/copyLink';
import { BottomDrawer } from '../ui/BottomDrawer';
import { GuideProgress, ProgressStatus, useProgress } from '../features/GuideProgress';
import { artSrc } from '../ui/warmArt';
import { SquadPage } from '../features/SquadPage';
import { ReferralsPage, warmFriendAvatar } from '../features/ReferralsPage';
import { SettingsPage } from '../features/SettingsPage';
import { AwardToast, useGuideAwards } from '../features/GuideAwards';
import { useGuideLocale } from '../features/guideLocale';
import { OwlPrices } from '../features/OwlPrices';
import { EcosystemPage } from '../features/EcosystemPage';
import { TokenTicker } from '../features/TokenQuotes';
import { GameArt } from '../ui/GameArt';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { AlbumLogo } from '../ui/AlbumLogo';
import { CarePage, InventoryPage, OwlPage } from '../features/InventoryPage';
import { CombatPage } from '../features/CombatPage';
import { CollectionPage } from '../features/CollectionPage';
import { CapsulePage } from '../features/CapsulePage';
import { OwlSkinCanvas } from '../features/OwlSkinCanvas';
import { homeOwlChangeEvent, hydrateHomeOwlFromCloud, readHomeOwlSkin } from '../features/skinRig';
import { achievementActions } from '../features/inventory';
import {useCallback,useEffect,useRef,useState}from'react';
import{Link,Navigate,useLocation,useNavigate}from'react-router';
import{AnimatePresence,motion}from'motion/react';
import all from'../../public/data/all_100_stickers.json';import quests from'../../public/data/secret_quests.json';import{impactHaptic,lightHaptic,telegramPopup}from'../telegram/client';
import { useGuideNavigation, useGuideScroll } from './navigation';
import { DockCoach } from './DockCoach';
import { AdminPage } from '../features/AdminPage';
import { authData, defaultGameLink, guideShareUrl, profileRequest, shareGuide, type GuideProfile } from '../features/guideProfile';

const sections = [
  ['Сквады и войны', 'Squads and wars', '/squads'],
  ['Секреты', 'Secrets', '/secrets'],
  ['Капсулы', 'Capsules', '/capsules'],
  ['Яйца и скины', 'Eggs and skins', '/owl'],
  ['Коллекции', 'Collections', '/collections'],
  ['Бои и навыки', 'Combat and skills', '/combat'],
  ['Предметы', 'Items', '/assets'],
  ['Экосистема', 'Ecosystem', '/ecosystem'],
  ['Пригласить друзей', 'Invite friends', '/referrals'],
  ['Памятка и лайфхаки', 'Memo & lifehacks', '/care'],
  ['Памятка и лайфхаки', 'Memo & lifehacks', '/modes'],
  ['Памятка и лайфхаки', 'Memo & lifehacks', '/lifehacks'],
  ['Памятка и лайфхаки', 'Memo & lifehacks', '/item-values'],
] as const;
type Item={id:number;name:string;name_ru?:string;description:string;short_descr:string;rarity:number;kind?:string;key?:string};
type SecretQuest={key:string;name:string;action:string;action_en?:string};
function App() {
  const loc = useLocation();
  const nav = useNavigate();
  useGuideAnalytics(loc.pathname);
  const [hamster, setHamster] = useState(false);
  const [hamsterLocked, setHamsterLocked] = useState(false);
  const [coach, setCoach] = useState<'dock' | 'theme' | null>(() => {
    if (localStorage.getItem(dockCoachKey) !== '1') return 'dock';
    return localStorage.getItem(themeCoachKey) === '1' ? null : 'theme';
  });
  const [joke, setJoke] = useState(localStorage.getItem('notwise.guide.secrets.v1') === '1' || sessionStorage.getItem('notwise.guide.secrets.v1') === '1');
  const [showJoke, setShowJoke] = useState(false);
  const jokePendingAward = useRef(false);
  const [popup, setPopup] = useState(false);
  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const awards = useGuideAwards(profile?.userId);
  const language = useGuideLocale(profile?.language);
  const english = language.locale === 'en';
  const [profileFailed, setProfileFailed] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);
  useEffect(() => {
    if (!authData()) return;
    const abort = new AbortController();
    profileRequest<GuideProfile>({}, abort.signal).then(setProfile).catch(() => {
      if (!abort.signal.aborted) setProfileFailed(true);
    });
    return () => abort.abort();
  }, [profileAttempt]);
  useEffect(() => {
    for (const friend of profile?.invited ?? []) if (friend.avatar) void warmFriendAvatar(friend.avatar);
  }, [profile]);
  const advanceCoach = () => {
    if (coach === 'dock') {
      localStorage.setItem(dockCoachKey, '1');
      setCoach('theme');
    } else {
      localStorage.setItem(themeCoachKey, '1');
      setCoach(null);
    }
  };
  useGuideScroll();
  useEffect(startMarketUpdates, []);
  useEffect(() => {
  if (!hamster) return;
  const unlock = window.setTimeout(() => setHamsterLocked(false), 1000);
  return () => window.clearTimeout(unlock);
}, [hamster]);
useEffect(() => {
  if (!hamster || hamsterLocked) return;
  const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setHamster(false); };
  window.addEventListener('keydown', close);
  return () => window.removeEventListener('keydown', close);
}, [hamster, hamsterLocked]);
const updateAward = awards.update;
const closeJoke = useCallback(() => {
  setShowJoke(false);
  if (jokePendingAward.current) {
    jokePendingAward.current = false;
    void updateAward('joke').catch(() => {});
  }
}, [updateAward]);
useEffect(() => {
  if (loc.pathname !== '/secrets' && showJoke) closeJoke();
}, [loc.pathname, showJoke, closeJoke]);
useEffect(()=>{telegramPopup()?.ready();const key='notwise.guide.startapp.v1';if(sessionStorage.getItem(key))return;const start=new URLSearchParams(location.search).get('startapp')??telegramPopup()?.initDataUnsafe?.start_param;if(start?.startsWith('b_')){sessionStorage.setItem(key,'1');const [buildPart]=start.split('--g_');nav('/combat/builds?build='+encodeURIComponent(buildPart),{replace:true});return;}const routes:Record<string,string>={capsules_gold:'/capsules/gold',eggs:'/owl',secrets:'/secrets',market:'/collections/market',charts:'/collections/charts'};if(start&&Object.hasOwn(routes,start)){sessionStorage.setItem(key,'1');nav(routes[start],{replace:true})}},[nav]);
const ask=()=>{
  lightHaptic();
  const tg=telegramPopup();
  if(tg?.isVersionAtLeast?.('6.2') && typeof tg.showPopup === 'function'){
    try {
      tg.showPopup({
        title: english ? 'Not Wise Secrets' : 'Секреты Not Wise',
        message: english ? 'Pay 1 ⭐ (Telegram Stars) to unlock all secrets' : 'Заплати 1 ⭐ (Telegram Stars), чтобы открыть все секреты',
        buttons:[{id:'pay',text: english ? 'Pay' : 'Заплатить',type:'default'},{id:'back',text: english ? 'Back' : 'Назад',type:'default'}]
      },()=>reveal());
      return;
    } catch { /* Older Telegram clients use the local dialog. */ }
  }
  setPopup(true);
};
function reveal(){setPopup(false);setJoke(true);setShowJoke(true);jokePendingAward.current=true;localStorage.setItem('notwise.guide.secrets.v1','1')}
return <GuideProgress user={profile?.userId}><div className={"shell "+(loc.pathname==='/'?'homeShell':'')}><header inert={hamster || coach !== null}><Link to="/" className="brand"><img src={artSrc('/brand/notwise.svg')} alt=""/><span>NOT WISE <i>GUIDE</i></span></Link>{loc.pathname === '/' && <TokenTicker/>}</header><main className="guideScreen" key={loc.pathname} inert={hamster || coach !== null}>{loc.pathname === '/' ? <Home onChatVisit={awards.noteChatVisit} onSquadVisit={() => { void awards.update('visit_squad').catch(() => {}); }} english={english} profile={profile} profileFailed={profileFailed} retryProfile={() => {
  setProfileFailed(false); setProfileAttempt(value => value + 1);
}}/> : <div className="guidePageContent">{loc.pathname === '/admin' ? <AdminPage profile={profile} profileFailed={profileFailed} onRetryProfile={() => {
  setProfileFailed(false);
  setProfileAttempt(value => value + 1);
}}/> : loc.pathname === '/support' || loc.pathname.startsWith('/support/') ?
  <SettingsPage profile={profile} earned={awards.earned} chatIssue={awards.chatIssue}/> : <Page english={english} profile={profile} onChatVisit={awards.noteChatVisit} ask={ask} joke={joke} showJoke={showJoke} popup={popup} reveal={reveal}
  referrals={<ReferralsPage profile={profile} failed={profileFailed} onSave={next => { setProfile(next); void awards.update().catch(() => {}); }} onRetry={() => {
    setProfileFailed(false);
    setProfileAttempt(value => value + 1);
  }}/>}/>}</div>}</main><AwardToast award={awards.toast} onDismiss={awards.dismissToast}/>{coach && !hamster && <><div className="dockCoachTint" data-step={coach} aria-hidden="true"/><DockCoach step={coach} onContinue={advanceCoach}/></>}{showJoke && loc.pathname === '/secrets' && <RevealedSecrets english={english} close={closeJoke}/>}<Dock english={english} disabled={coach === 'theme'} onShortTap={coach === 'dock' ? advanceCoach : undefined} hamster={hamster} locked={hamsterLocked} onHamster={() => {
  if (hamsterLocked) return;
  if (hamster) {
    setHamster(false);
  } else {
    setHamsterLocked(true);
    setHamster(true);
    void awards.update('mascot').catch(() => {});
  }
}}/>
<AnimatePresence>{hamster && <motion.button className="hamsterShade" aria-label={english ? "Hide hamster" : "Спрятать хомяка"} disabled={hamsterLocked}
  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setHamster(false)}/>}</AnimatePresence>
<AnimatePresence>{hamster && <motion.aside className="hamster" role="status"
  initial={{y:110,opacity:0}} animate={{y:0,opacity:1}} exit={{y:110,opacity:0}} transition={{duration:.22}}>
  <p className="hamsterSpeech">{english ? '*#$@#, go poke yourself %*!' : '*#$@#, себя потыкай %*!'}</p>
  <img src={artSrc('/brand/hamster.png')} width="520" height="564" alt={english ? "CryptoOne Hamster" : "Хомяк CryptoOne"}/>
</motion.aside>}</AnimatePresence></div></GuideProgress>}
function Dock({ english: en, disabled = false, hamster, locked, onHamster, onShortTap }: { english: boolean; disabled?: boolean; hamster: boolean; locked: boolean; onHamster: () => void; onShortTap?: () => void }) {
  const location = useLocation();
  const navigation = useGuideNavigation();
  const gesture = useRef({ count: 0, started: 0, pointer: -1, x: 0, y: 0, timer: 0 });
  const back = () => {
    if (hamster) { onHamster(); return; }
    navigation.back();
  };
  const cancel = () => {
    const state = gesture.current;
    clearTimeout(state.timer);
    state.pointer = -1;
    state.count = 0;
  };
  useEffect(() => {
    if (disabled) cancel();
  }, [disabled]);
  useEffect(() => {
    document.addEventListener('visibilitychange', cancel);
    return () => { document.removeEventListener('visibilitychange', cancel); cancel(); };
  }, []);
  return <nav className="gameDock" aria-label={en ? "Navigation" : "Навигация"} data-mascot-open={hamster || undefined} data-coach-locked={disabled || undefined} inert={disabled || undefined}>
    <button className="logoBtn" disabled={locked || disabled} aria-label={hamster ? (en ? "Hide hamster" : "Спрятать хомяка") : (en ? "Back. Hold to go Home" : "Назад. Удерживайте для перехода на главную")}
      onPointerDown={event => {
        if (disabled) return;
        const state = gesture.current;
        if (!event.isPrimary) { cancel(); return; }
        if (event.button !== 0) return;
        state.pointer = event.pointerId;
        state.x = event.clientX;
        state.y = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
        state.timer = window.setTimeout(() => {
          cancel();
          impactHaptic('heavy');
          if (onShortTap) {
            onShortTap();
            return;
          }
          if (hamster) onHamster();
          else navigation.home();
        }, 500);
      }}
      onPointerMove={event => {
        const state = gesture.current;
        if (state.pointer === event.pointerId && Math.hypot(event.clientX-state.x,event.clientY-state.y) > 12) cancel();
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={() => { if (gesture.current.pointer !== -1) cancel(); }}
      onPointerUp={event => {
        if (disabled) return;
        const state = gesture.current;
        if (event.pointerId !== state.pointer) return;
        clearTimeout(state.timer);
        state.pointer = -1;
        lightHaptic();
        if (onShortTap) {
          state.count = 0;
          onShortTap();
          return;
        }
        if (hamster || location.pathname !== '/') {
          state.count = 0;
          back();
          return;
        }
        const now = performance.now();
        if (!state.count || now - state.started >= 3000) {
          state.count = 0;
          state.started = now;
        }
        if (++state.count === 10) {
          state.count = 0;
          onHamster();
        }
      }}
      onClick={event => {
        if (disabled) return;
        if (event.detail === 0) {
          lightHaptic();
          if (onShortTap) { onShortTap(); return; }
          back();
        }
      }}
      onContextMenu={event => event.preventDefault()}>
      <img src={artSrc('/brand/cryptoone.svg')} width="32" height="33" alt=""/>
    </button>
  </nav>;
}
function Home({ profile, profileFailed, retryProfile, onChatVisit, onSquadVisit, english: en }: {
  english: boolean; profile: GuideProfile | null; profileFailed: boolean; retryProfile: () => void; onChatVisit: () => void; onSquadVisit: () => void;
}) {
 const [share, setShare] = useState(false);
 const [homeOwl, setHomeOwl] = useState(readHomeOwlSkin);
 useEffect(() => {
   const sync = () => setHomeOwl(readHomeOwlSkin());
   window.addEventListener(homeOwlChangeEvent, sync);
   hydrateHomeOwlFromCloud(sel => setHomeOwl({ selection: sel, isCustom: true }));
   return () => window.removeEventListener(homeOwlChangeEvent, sync);
 }, []);
 const fromInvite = authData() && /^g_[a-f0-9]{32}$/.test(telegramPopup()?.initDataUnsafe?.start_param ?? '');
 const homeTiles = [
  { path: '/care', icon: '/game/items/chiller-open.webp', art: '/game/ui/fight-vs.png',
    ru: ['Памятка и лайфхаки', 'Таймеры, фарм SP, режимы и советы'], en: ['Memo & lifehacks', 'Timers, SP farm, modes and tips'] },
  { path: '/secrets', icon: '/game/stickers/9.webp', art: '/game/stickers/42.webp',
    ru: ['Секреты', 'Скрытые квесты и достижения'], en: ['Secrets', 'Hidden quests and achievements'] },
  { path: '/squads', icon: '/game/items/lighter.webp', art: '/game/war/siege-header.webp',
    ru: ['Сквады и войны', 'Ритуалы, карта осад и магазин'], en: ['Squads and wars', 'Rituals, sieges and shop'] },
  { path: '/combat', icon: '/game/skills/1.png', art: '/game/skills/16.png',
    ru: ['Бои и навыки', 'Правила боя, навыки и калькулятор билдов'], en: ['Combat and skills', 'Rules, skills and build calculator'] },
  { path: '/capsules', icon: '/game/capsules/gold.webp', art: '/game/capsules/silver.webp',
    ru: ['Капсулы', 'Шансы на $NOT, яйца и цены открытия'], en: ['Capsules', 'Loot odds, $NOT and opening costs'] },
  { path: '/assets', icon: '/game/items/ring-wit-3.webp', art: '/game/items/book.webp',
    ru: ['Предметы', 'Еда, кольца, расходники и Getgems'], en: ['Items', 'Food, rings, gear and Getgems'] },
  { path: '/owl', icon: '/game/items/egg.webp', art: '/game/skins/5565.svg',
    ru: ['Яйца и скины', 'Дроп, облики сов и калькулятор фарма'], en: ['Eggs and skins', 'Egg drops, skins and farm bonus'] },
  { path: '/collections', icon: '/game/albums/1.webp', art: '/game/stickers/1.webp',
    ru: ['Коллекции', 'Стикеры, альбомы и Getgems'], en: ['Collections', 'Stickers and Getgems'] },
  { path: '/ecosystem', icon: '/brand/notwise.svg', art: '/brand/projects/grouche.png',
    ru: ['Экосистема', 'Токены, проекты и курсы'], en: ['Ecosystem', 'Projects and token prices'] },
  { path: '/referrals', icon: '/game/items/wise-coin.webp', art: '/game/items/referral-egg.webp',
    ru: ['Пригласить друзей', 'Твоя ссылка и список приглашённых'], en: ['Invite friends', 'Your links and invitations'] },
] as const;
 return <>
  <section className="gameHero">
    <a className="heroSquadPill" href={squadLink} onClick={() => { lightHaptic(); onSquadVisit(); }}>
      <span className="squadMark" aria-hidden="true"/>
      <span>{en ? 'Our squad' : 'Наш сквад'}</span>
    </a>
    <div className="heroCopy"><h1>{en ? <>NOT Wise <span>Guide</span></> : <>Гайд по <span>NOT Wise</span></>}</h1><p className="heroSub">{en ? 'Loot, combat and owl care.' : 'Награды, бои и уход за совой.'}</p></div>
    <div className="heroOwlStage" aria-hidden="true">
      <OwlSkinCanvas selection={homeOwl.selection} size={184}/>
    </div>
    <div className="heroActions">
      {fromInvite && !profile ? (
        <button className="primary openGame" disabled={!profileFailed} onClick={retryProfile}>
          {profileFailed ? (en ? 'Retry' : 'Повторить') : (en ? 'Checking…' : 'Проверяем…')}
        </button>
      ) : (
        <a className="primary openGame" href={profile?.gameEntry ?? defaultGameLink} onClick={() => trackGuide('action:game')}>
          <svg className="launchMark" viewBox="0 0 1325 1138" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="m616.57 35.87-579.88 1004.38c-20.52 35.53 5.13 79.95 46.16 79.95h1159.75c41.03 0 66.68-44.42 46.16-79.95l-579.87-1004.38c-20.52-35.53-71.81-35.53-92.32 0zm46.16 119.92 503.11 871.41h-1006.23z"/>
            <path fill="currentColor" d="m662.73 534.5c-157.09 0-296.01 81.46-364.89 203.93-10.55 18.75-10.55 41.68 0 60.43 68.88 122.47 207.8 203.94 364.89 203.94s296.01-81.47 364.89-203.94c10.55-18.75 10.55-41.68 0-60.43-68.88-122.47-207.8-203.93-364.89-203.93zm0 73.17c125.99 0 237.24 63.36 295.01 158.98-57.77 95.62-169.02 158.98-295.01 158.98s-237.24-63.36-295.01-158.98c57.77-95.62 169.02-158.98 295.01-158.98z"/>
            <circle fill="currentColor" cx="662.73" cy="766.65" r="95.12"/>
          </svg>
          <span>{en ? 'Open the game' : 'Открыть игру'}</span>
        </a>
      )}
      <button className="heroShare secondary" aria-haspopup="dialog" onClick={() => { lightHaptic(); setShare(true); }}>
        <GameGlyph name="share"/>
        <span>{en ? 'Share' : 'Поделиться'}</span>
      </button>
    </div>
  </section>
  {share && <ShareDialog english={en} referralCode={profile?.referralCode} close={() => setShare(false)}/>}
  <OwlPrices/>
  <section className="homeGameActions" aria-label={en ? 'Calculators' : 'Калькуляторы'}>
    <Link to="/combat/builds" onClick={() => { lightHaptic(); trackGuide('action:builds'); }}>
      <span className="homeCalcIcon" aria-hidden="true"><GameGlyph name="fight"/></span>
      <span>{en ? 'Build Constructor' : 'Конструктор билдов'}</span>
      <span className="rowChevron" aria-hidden="true"/>
    </Link>
    <Link to="/owl/skins" onClick={() => lightHaptic()}>
      <span className="homeCalcIcon" aria-hidden="true"><GameGlyph name="skin"/></span>
      <span>{en ? 'Farming Calculator' : 'Калькулятор фарма'}</span>
      <span className="rowChevron" aria-hidden="true"/>
    </Link>
  </section>
  <div className="sectionHeading"><div><h2>{en ? 'Explore' : 'Что ищешь?'}</h2></div></div>
  <div className="guideGrid">{homeTiles.map(tile => {
    const [name, description] = en ? tile.en : tile.ru;
    return <Link to={tile.path} className="guideTile" key={tile.path}>
      <img className="guideTileArt" src={artSrc(tile.art)} alt="" width="108" height="108"/>
      <span className="guideTileIcon">{tile.path === '/collections' ? <AlbumLogo id={1} size={44}/> : tile.path === '/combat' ? <GameAttribute name="wisdom"/> : <GameArt path={tile.icon} size={40}/>}</span>
      <span className="tileText"><b>{name}</b><small>{description}</small></span>
    </Link>;
  })}</div>
  <div className="supportFooter"><a className="supportPill" href={channelInvite} onClick={() => trackGuide('action:channel')}><img className="channelLogo" src={artSrc('/brand/cryptoone-channel.jpg')} alt="" width="24" height="24"/>{en ? 'CryptoOne channel' : 'Канал CryptoOne'}</a><a className="supportPill" href={communityChat} onClick={() => { onChatVisit(); trackGuide('action:chat'); }}><GameGlyph name="chat"/>{en ? 'Join the chat' : 'Присоединиться к чату'}</a><Link className="supportPill" to="/support"><GameGlyph name="settings"/>{en ? 'Settings' : 'Настройки'}</Link></div>
  {profile?.isAdmin && <Link className="textLink" to="/admin">{en ? 'Guide admin' : 'Управление гайдом'}</Link>}
 </>;
}
function ShareDialog({ close, english: en, referralCode }: { close: () => void; english: boolean; referralCode?: string }) {
  const field = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState('');
  const url = guideShareUrl(referralCode);
  async function copy() {
    lightHaptic();
    const copied = await copyLink(url, field.current);
    if (copied) trackGuide('action:share_copy');
    setFeedback(copied ? en ? 'Link copied.' : 'Ссылка скопирована.'
      : en ? 'Link selected. Choose Copy.' : 'Ссылка выделена. Выбери «Копировать» в меню выделения.');
  }
  function chooseRecipient(requestClose: () => void) {
    lightHaptic();
    trackGuide('action:share_send');
    void shareGuide(url, en ? 'NOT Wise Guide' : 'Гайд по NOT Wise');
    requestClose();
  }
  return (
    <BottomDrawer title={en ? 'Share the guide' : 'Поделиться гайдом'} closeLabel={en ? 'Close' : 'Закрыть'} onClose={close}>
      {requestClose => (
        <div className="drawerActionStack">
          <label className="field shareLink"><span className="sr-only">{en ? 'Guide link' : 'Ссылка на гайд'}</span>
            <input ref={field} readOnly value={url} onFocus={event => event.currentTarget.select()}/>
          </label>
          <button className="primary" onClick={() => chooseRecipient(requestClose)}>{en ? 'Choose a recipient' : 'Выбрать получателя'}</button>
          <button className="secondary" onClick={() => void copy()}>{en ? 'Copy link' : 'Скопировать ссылку'}</button>
          {feedback && <p className="supportStatus" role="status">{feedback}</p>}
        </div>
      )}
    </BottomDrawer>
  );
}
function Card({children}:{children:React.ReactNode}){return <section className="card">{children}</section>}
function Page({ english: en, profile, onChatVisit, ask, joke, showJoke, popup, reveal, referrals }: {
  english: boolean; profile: GuideProfile | null; onChatVisit: () => void;
  ask: () => void; joke: boolean; showJoke: boolean; popup: boolean; reveal: () => void; referrals: React.ReactNode;
}) {
  const { pathname, hash, state } = useLocation();
  if (pathname === '/care/resources') return <Navigate to="/care" state={state} replace/>;
  if (pathname === '/owl/care' || pathname === '/combat/modes') {
    return <Navigate to={(pathname === '/owl/care' ? '/care' : '/modes') + hash} state={state} replace/>;
  }
  const section = sections.find(([,, path]) => pathname === path || pathname.startsWith(path + '/'));
  if (!section) return <Card>
    <h1>{en ? 'Page not found' : 'Страница не найдена'}</h1><Link className="textLink" to="/">{en ? 'Back to Home' : 'На главную'}</Link>
  </Card>;
  const route = section[2];
  return <>
    <h1 className="pageTitle">{pathname === '/collections/charts' ? (en ? 'Market & Charts' : 'Маркет и графики') : (en ? section[1] : section[0])}</h1>
    {route === '/capsules' && <CapsulePage/>}
    {route === '/owl' && <OwlPage/>}
    {route === '/collections' && <CollectionPage/>}
    {route === '/ecosystem' && <EcosystemPage gameEntry={profile?.gameEntry ?? defaultGameLink}/>}
    {route === '/combat' && <CombatPage referralCode={profile?.referralCode}/>}
    {(route === '/care' || route === '/modes' || route === '/lifehacks' || route === '/item-values') && <CarePage/>}
    {route === '/squads' && <SquadPage gameEntry={profile?.gameEntry ?? defaultGameLink} onChatVisit={onChatVisit}/>}
    {route === '/secrets' && <Secrets english={en} ask={ask} joke={joke} showJoke={showJoke} popup={popup} reveal={reveal}/>}
    {route === '/assets' && <InventoryPage/>}
    {route === '/referrals' && referrals}
  </>;
}
function Secrets({ english: en, ask, joke, showJoke, popup, reveal }: { english: boolean; ask: () => void; joke: boolean; showJoke: boolean; popup: boolean; reveal: () => void }) {
  const { hash, pathname, state } = useLocation();
  const keepParent = state?.guideDetail === true;
  const tab = pathname === '/secrets/achievements' ? 'achievement' : 'secret';
  const selected = tab === 'secret' && hash.startsWith('#sticker-') ? Number(hash.slice(9)) : null;
  const { completed, collected, percentages, setMark } = useProgress();
  const isDone = (id: number) => completed.includes(id) || collected.includes(id);
  const items = (all as Item[]).filter(item => item.kind === tab);
  const groups = [
    { title: en ? 'Remaining' : 'Осталось', items: items.filter(item => !isDone(item.id)) },
    { title: en ? 'Completed' : 'Выполнено', items: items.filter(item => isDone(item.id)) },
  ];
  const wasLocked = useRef(!joke);
  useEffect(() => {
    if (!joke || popup || showJoke || selected === null || !wasLocked.current) return;
    wasLocked.current = false;
    requestAnimationFrame(() => {
      document.getElementById(`sticker-${selected}`)?.scrollIntoView({ block: 'start' });
    });
  }, [joke, popup, showJoke, selected]);
  return <>
    <p className="intro">{en ? 'Hidden actions and regular achievements unlock stickers for your albums.' : 'Скрытые действия и обычные достижения открывают стикеры для альбомов.'}</p>
    <div className="choiceBar profileTabs" aria-label={en ? 'How to unlock' : 'Способ получения'}>
      <Link to="/secrets" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={tab === 'secret' ? 'page' : undefined}><GameGlyph name="lock"/>{en ? 'Secrets' : 'Секреты'}</Link>
      <Link to="/secrets/achievements" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={tab === 'achievement' ? 'page' : undefined}><GameGlyph name="treasure"/>{en ? 'Achievements' : 'Достижения'}</Link>
    </div>
    {tab === 'secret' && !joke ? <Card>
      <h2>{en ? '20 hidden quests' : '20 скрытых заданий'}</h2>
      <p>{en ? 'Unlock the list to see every action and reward.' : 'Открой список, чтобы увидеть действия и награды.'}</p>
      <button className="primary" onClick={ask}>{en ? 'Unlock secrets' : 'Открыть секреты'}</button>
    </Card> : <Card>
      <div className="progressCounts">
        <strong>{en ? `${groups[1].items.length}/${items.length} completed` : `${groups[1].items.length}/${items.length} выполнено`}</strong>
        <span>{en ? `${groups[0].items.length} left` : `Осталось ${groups[0].items.length}`}</span>
      </div>
      <ProgressStatus/>
      {tab === 'secret' && percentages && <p className="caption">{en ? 'Percentages show the share of players who checked off this secret in the guide.' : 'Проценты показывают долю игроков, отметивших секрет в гайде.'}</p>}
      {groups.filter(group => group.items.length).map(group => <section className="progressGroup" key={group.title}>
        <h2>{group.title}</h2>
        {group.items.map(item => {
        const quest = (quests.secret_quests as SecretQuest[]).find(row => row.key === item.key);
        const title = en ? item.name : (item.name_ru || (quest?.name.match(/\((.+)\)/)?.[1] ?? item.name));
        const actionText = tab === 'achievement'
          ? (en ? item.short_descr : (achievementActions[item.id] ?? item.short_descr))
          : (en ? (quest?.action_en ?? quest?.action ?? item.short_descr) : (quest?.action ?? 'Точное условие пока не подтверждено.'));
        return <article className="secretRow" id={`sticker-${item.id}`} key={item.id} data-selected={selected === item.id}>
          <GameArt path={`/game/stickers/${item.id}.webp`} size={42}/>
          <div><h3>{title}</h3><small>{!en && title !== item.name ? item.name + ' · ' : ''}{en ? `Sticker #${item.id}` : `Стикер №${item.id}`}</small>
            <p>{actionText}</p>
            {tab === 'secret' && percentages && <small>{en ? `Checked by ${percentages[item.id] ?? 0}% of players` : `Отметили ${percentages[item.id] ?? 0}% игроков`}</small>}
          </div>
          <label className="secretCheck" title={en ? 'Completed' : 'Выполнено'}><input type="checkbox" checked={isDone(item.id)} onChange={event => setMark('completed', item.id, event.target.checked)}/><span className="sr-only">{en ? `Completed: ${title}` : `Выполнено: ${title}`}</span></label>
        </article>;
        })}
      </section>)}
      {tab === 'secret' && <DetailLink className="textLink" to="/support">{en ? 'Support the project' : 'Поддержать проект'}</DetailLink>}
    </Card>}
    {popup && <SecretDialog english={en} reveal={reveal}/>}
  </>;
}
function RevealedSecrets({ english: en, close }: { english: boolean; close: () => void }) {
  return (
    <BottomDrawer title={en ? 'Just kidding 😄' : 'Ладно, пошутили 😄'} closeLabel={en ? 'Close' : 'Закрыть'} onClose={close}>
      {requestClose => (
        <div className="drawerActionStack">
          <p>{en ? 'All secrets are completely free.' : 'Все секреты бесплатны.'}</p>
          <button className="primary" onClick={requestClose}>{en ? 'To secrets' : 'К секретам'}</button>
          <DetailLink className="secondary" to="/support" onClick={requestClose}>{en ? 'Support the project' : 'Поддержать проект'}</DetailLink>
        </div>
      )}
    </BottomDrawer>
  );
}
function SecretDialog({ english: en, reveal }: { english: boolean; reveal: () => void }) {
  return (
    <BottomDrawer title={en ? 'Not Wise Secrets' : 'Секреты Not Wise'} closeLabel={en ? 'Close dialog' : 'Закрыть окно'} onClose={reveal}>
      {requestClose => (
        <div className="drawerActionStack">
          <p>{en ? 'Pay 1 ⭐ (Telegram Stars) to unlock all secrets' : 'Заплати 1 ⭐ (Telegram Stars), чтобы открыть все секреты'}</p>
          <button className="primary" onClick={requestClose}>{en ? 'Pay' : 'Заплатить'}</button>
          <button className="secondary" onClick={requestClose}>{en ? 'Back' : 'Назад'}</button>
        </div>
      )}
    </BottomDrawer>
  );
}
export {App};

