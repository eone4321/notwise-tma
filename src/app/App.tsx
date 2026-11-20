import { DetailLink } from '../ui/DetailLink';
import { trackGuide, useGuideAnalytics } from '../features/guideAnalytics';
import { channelInvite, communityChat, squadLink } from '../domain/guide-links';
import { startMarketUpdates } from '../features/marketData';
import { copyLink } from '../ui/copyLink';
import { GuideProgress, ProgressStatus, useProgress } from '../features/GuideProgress';
import { useModal } from '../ui/useModal';
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
import { GameGlyph } from '../ui/GameGlyph';
import { AlbumLogo } from '../ui/AlbumLogo';
import { CarePage, InventoryPage, OwlPage } from '../features/InventoryPage';
import { CombatPage } from '../features/CombatPage';
import { CollectionPage } from '../features/CollectionPage';
import { CapsulePage } from '../features/CapsulePage';
import { OwlSkinCanvas } from '../features/OwlSkinCanvas';
import { homeOwlChangeEvent, hydrateHomeOwlFromCloud, readHomeOwlSkin } from '../features/skinRig';
import { achievementActions } from '../features/inventory';
import {useEffect,useRef,useState}from'react';
import{Link,Navigate,useLocation,useNavigate}from'react-router';
import{AnimatePresence,motion}from'motion/react';
import all from'../../public/data/all_100_stickers.json';import quests from'../../public/data/secret_quests.json';import{impactHaptic,lightHaptic,telegramPopup}from'../telegram/client';
import { useGuideNavigation, useGuideScroll } from './navigation';
import { DockCoach } from './DockCoach';
import { AdminPage } from '../features/AdminPage';
import { authData, defaultGameLink, guideShareUrl, profileRequest, shareGuide, type GuideProfile } from '../features/guideProfile';

const sections = [
  ['Сквады и войны', '/squads'],
  ['Секреты', '/secrets'], ['Капсулы', '/capsules'], ['Яйца и скины', '/owl'],
  ['Коллекции', '/collections'], ['Бои и навыки', '/combat'], ['Предметы', '/assets'],
  ['Экосистема', '/ecosystem'], ['Пригласить друзей', '/referrals'],
  ['Памятка и лайфхаки', '/care'], ['Памятка и лайфхаки', '/modes'], ['Памятка и лайфхаки', '/lifehacks'],
] as const;
type Item={id:number;name:string;name_ru?:string;description:string;short_descr:string;rarity:number;kind?:string;key?:string};
function App() {
  const loc = useLocation();
  const nav = useNavigate();
  useGuideAnalytics(loc.pathname);
  const [hamster, setHamster] = useState(false);
  const [hamsterLocked, setHamsterLocked] = useState(false);
  const [coach, setCoach] = useState<'dock' | 'theme' | null>(() => {
    if (localStorage.getItem('notwise.guide.dock.v1') !== '1') return 'dock';
    return localStorage.getItem('notwise.guide.theme-tip.v1') === '1' ? null : 'theme';
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
      localStorage.setItem('notwise.guide.dock.v1', '1');
      setCoach('theme');
    } else {
      localStorage.setItem('notwise.guide.theme-tip.v1', '1');
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
const closeJoke = () => {
  setShowJoke(false);
  if (jokePendingAward.current) {
    jokePendingAward.current = false;
    void awards.update('joke').catch(() => {});
  }
};
useEffect(() => {
  if (loc.pathname !== '/secrets' && showJoke) closeJoke();
});
useEffect(()=>{telegramPopup()?.ready();const key='notwise.guide.startapp.v1';if(sessionStorage.getItem(key))return;const start=new URLSearchParams(location.search).get('startapp')??telegramPopup()?.initDataUnsafe?.start_param;if(start?.startsWith('b_')){sessionStorage.setItem(key,'1');const [buildPart]=start.split('--g_');nav('/combat/builds?build='+encodeURIComponent(buildPart),{replace:true});return;}const routes:Record<string,string>={capsules_gold:'/capsules/gold',eggs:'/owl',secrets:'/secrets',market:'/collections/market',charts:'/collections/charts'};if(start&&Object.hasOwn(routes,start)){sessionStorage.setItem(key,'1');nav(routes[start],{replace:true})}},[nav]);const ask=()=>{lightHaptic();const tg=telegramPopup();if(tg?.showPopup){try { tg.showPopup({title:'Секреты Not Wise',message:'Заплати 1 ⭐ (Telegram Stars), чтобы открыть все секреты',buttons:[{id:'pay',text:'Заплатить',type:'default'},{id:'back',text:'Назад',type:'default'}]},()=>reveal()); return; } catch { /* Older Telegram clients use the local dialog. */ }}setPopup(true)};function reveal(){setPopup(false);setJoke(true);setShowJoke(true);jokePendingAward.current=true;localStorage.setItem('notwise.guide.secrets.v1','1')}
return <GuideProgress user={profile?.userId}><div className={"shell "+(loc.pathname==='/'?'homeShell':'')}><header inert={hamster || coach !== null}><Link to="/" className="brand"><img src={artSrc('/brand/notwise.svg')} alt=""/><span>NOT WISE <i>GUIDE</i></span></Link>{loc.pathname === '/' && <TokenTicker/>}</header><main className="guideScreen" key={loc.pathname} inert={hamster || coach !== null}>{loc.pathname === '/' ? <Home onChatVisit={awards.noteChatVisit} onSquadVisit={() => { void awards.update('visit_squad').catch(() => {}); }} english={english} profile={profile} profileFailed={profileFailed} retryProfile={() => {
  setProfileFailed(false); setProfileAttempt(value => value + 1);
}}/> : <div className="guidePageContent">{loc.pathname === '/admin' ? <AdminPage profile={profile}/> : loc.pathname === '/support' || loc.pathname.startsWith('/support/') ?
  <SettingsPage profile={profile} earned={awards.earned} chatIssue={awards.chatIssue}/> : <div lang="ru"><Page profile={profile} onChatVisit={awards.noteChatVisit} ask={ask} joke={joke} popup={popup} reveal={reveal}
  referrals={<ReferralsPage profile={profile} failed={profileFailed} onSave={next => { setProfile(next); void awards.update().catch(() => {}); }} onRetry={() => {
    setProfileFailed(false);
    setProfileAttempt(value => value + 1);
  }}/>}/></div>}</div>}</main><AwardToast award={awards.toast} onDismiss={awards.dismissToast}/>{coach && !hamster && <><div className="dockCoachTint" aria-hidden="true"/><DockCoach step={coach} onContinue={advanceCoach}/></>}{showJoke && loc.pathname === '/secrets' && <RevealedSecrets close={closeJoke}/>}<Dock onGesture={coach ? advanceCoach : undefined} hamster={hamster} locked={hamsterLocked} onHamster={() => {
  if (hamsterLocked) return;
  if (hamster) {
    setHamster(false);
  } else {
    setHamsterLocked(true);
    setHamster(true);
    void awards.update('mascot').catch(() => {});
  }
}}/>
<AnimatePresence>{hamster && <motion.button className="hamsterShade" aria-label="Спрятать хомяка" disabled={hamsterLocked}
  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setHamster(false)}/>}</AnimatePresence>
<AnimatePresence>{hamster && <motion.aside className="hamster" role="status"
  initial={{y:110,opacity:0}} animate={{y:0,opacity:1}} exit={{y:110,opacity:0}} transition={{duration:.22}}>
  <p className="hamsterSpeech">*#$@#, себя потыкай %*!</p>
  <img src={artSrc('/brand/hamster.png')} width="1264" height="1371" alt="Хомяк CryptoOne"/>
</motion.aside>}</AnimatePresence></div></GuideProgress>}
function Dock({ hamster, locked, onHamster, onGesture }: { hamster: boolean; locked: boolean; onHamster: () => void; onGesture?: () => void }) {
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
    document.addEventListener('visibilitychange', cancel);
    return () => { document.removeEventListener('visibilitychange', cancel); cancel(); };
  }, []);
  return <nav className="gameDock" aria-label="Навигация" data-mascot-open={hamster || undefined}>
    <button className="logoBtn" disabled={locked} aria-label={hamster ? "Спрятать хомяка" : "Назад. Удерживайте для перехода на главную"}
      onPointerDown={event => {
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
          onGesture?.();
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
        const state = gesture.current;
        if (event.pointerId !== state.pointer) return;
        clearTimeout(state.timer);
        state.pointer = -1;
        lightHaptic();
        onGesture?.();
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
      onClick={event => { if (event.detail === 0) { lightHaptic(); onGesture?.(); back(); } }}
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
  { path: '/secrets', icon: '/game/stickers/9.webp', art: '/game/stickers/42.webp',
    ru: ['Секреты', 'Скрытые квесты и достижения'], en: ['Secrets', 'Hidden quests and achievements'] },
  { path: '/combat', icon: '/game/skills/1.png', art: '/game/skills/16.png',
    ru: ['Бои и навыки', 'Правила боя, навыки и калькулятор билдов'], en: ['Combat and skills', 'Rules, skills and build calculator'] },
  { path: '/care', icon: '/game/items/book.webp', art: '/game/ui/fight-vs.png',
    ru: ['Памятка и лайфхаки', 'Таймеры, фарм SP, режимы и советы'], en: ['Memo & lifehacks', 'Timers, SP farm, modes and tips'] },
  { path: '/capsules', icon: '/game/capsules/gold.webp', art: '/game/capsules/silver.webp',
    ru: ['Капсулы', 'Шансы на $NOT, яйца и цены открытия'], en: ['Capsules', 'Loot odds, $NOT and opening costs'] },
  { path: '/squads', icon: '/game/items/lighter.webp', art: '/game/war/siege-header.webp',
    ru: ['Сквады и войны', 'Ритуалы, карта осад и магазин'], en: ['Squads and wars', 'Rituals, sieges and shop'] },
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
          <span className="launchMark" aria-hidden="true"/>
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
      <span>{en ? 'Build calculator' : 'Калькулятор билдов'}</span>
      <span className="rowChevron" aria-hidden="true"/>
    </Link>
    <Link to="/owl/skins" onClick={() => lightHaptic()}>
      <span className="homeCalcIcon" aria-hidden="true"><GameGlyph name="skin"/></span>
      <span>{en ? 'Skin calculator' : 'Калькулятор скинов'}</span>
      <span className="rowChevron" aria-hidden="true"/>
    </Link>
  </section>
  <div className="sectionHeading"><div><h2>{en ? 'Explore' : 'Что ищешь?'}</h2></div></div>
  <div className="guideGrid">{homeTiles.map(tile => {
    const [name, description] = en ? tile.en : tile.ru;
    return <Link to={tile.path} className="guideTile" key={tile.path}>
      <img className="guideTileArt" src={artSrc(tile.art)} alt="" width="108" height="108"/>
      <span className="guideTileIcon">{tile.path === '/collections' ? <AlbumLogo id={1} size={44}/> : <GameArt path={tile.icon} size={40}/>}</span>
      <span className="tileText"><b>{name}</b><small>{description}</small></span>
    </Link>;
  })}</div>
  <div className="supportFooter"><a className="supportPill" href={channelInvite} onClick={() => trackGuide('action:channel')}><img className="channelLogo" src={artSrc('/brand/cryptoone-channel.jpg')} alt="" width="24" height="24"/>{en ? 'CryptoOne channel' : 'Канал CryptoOne'}</a><a className="supportPill" href={communityChat} onClick={() => { onChatVisit(); trackGuide('action:chat'); }}><GameGlyph name="chat"/>{en ? 'Join the chat' : 'Присоединиться к чату'}</a><Link className="supportPill" to="/support"><GameGlyph name="settings"/>{en ? 'Settings' : 'Настройки'}</Link></div>
  {profile?.isAdmin && <Link className="textLink" to="/admin">Управление гайдом</Link>}
 </>;
}
function ShareDialog({ close, english: en, referralCode }: { close: () => void; english: boolean; referralCode?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState('');
  const url = guideShareUrl(referralCode);
  useModal(dialog, true);
  async function copy() {
    lightHaptic();
    const copied = await copyLink(url, field.current);
    if (copied) trackGuide('action:share_copy');
    setFeedback(copied ? en ? 'Link copied.' : 'Ссылка скопирована.'
      : en ? 'Link selected. Choose Copy.' : 'Ссылка выделена. Выбери «Копировать» в меню выделения.');
  }
  function chooseRecipient() {
    lightHaptic();
    trackGuide('action:share_send');
    void shareGuide(url);
    close();
  }
  return <dialog className="modal" ref={dialog} aria-labelledby="share-title"
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="dialogBody">
      <div className="tokenRatesDialogHeader"><h2 id="share-title" data-dialog-title tabIndex={-1}>{en ? 'Share the guide' : 'Поделиться гайдом'}</h2>
        <button className="close" onClick={close} aria-label="Закрыть">×</button></div>
      <label className="field shareLink"><span className="sr-only">Ссылка на гайд</span>
        <input ref={field} readOnly value={url} onFocus={event => event.currentTarget.select()}/>
      </label>
      <button className="primary" onClick={chooseRecipient}>{en ? 'Choose a recipient' : 'Выбрать получателя'}</button>
      <button className="secondary" onClick={() => void copy()}>{en ? 'Copy link' : 'Скопировать ссылку'}</button>
      {feedback && <p className="supportStatus" role="status">{feedback}</p>}
    </div>
  </dialog>;
}
function Card({children}:{children:React.ReactNode}){return <section className="card">{children}</section>}
function Page({ profile, onChatVisit, ask, joke, popup, reveal, referrals }: {
  profile: GuideProfile | null; onChatVisit: () => void;
  ask: () => void; joke: boolean; popup: boolean; reveal: () => void; referrals: React.ReactNode;
}) {
  const { pathname, hash, state } = useLocation();
  if (pathname === '/owl/care' || pathname === '/combat/modes') {
    return <Navigate to={(pathname === '/owl/care' ? '/care' : '/modes') + hash} state={state} replace/>;
  }
  const section = sections.find(([, path]) => pathname === path || pathname.startsWith(path + '/'));
  if (!section) return <Card>
    <h1>Страница не найдена</h1><Link className="textLink" to="/">На главную</Link>
  </Card>;
  return <>
    <h1 className="pageTitle">{pathname === '/collections/charts' ? 'Маркет и графики' : section[0]}</h1>
    {section?.[1] === '/capsules' && <CapsulePage/>}
    {section?.[1] === '/owl' && <OwlPage/>}
    {section?.[1] === '/collections' && <CollectionPage/>}
    {section?.[1] === '/ecosystem' && <EcosystemPage gameEntry={profile?.gameEntry ?? defaultGameLink}/>}
    {section?.[1] === '/combat' && <CombatPage referralCode={profile?.referralCode}/>}
    {(section?.[1] === '/care' || section?.[1] === '/modes' || section?.[1] === '/lifehacks') && <CarePage/>}
    {section?.[1] === '/squads' && <SquadPage gameEntry={profile?.gameEntry ?? defaultGameLink} onChatVisit={onChatVisit}/>}
    {section?.[1] === '/secrets' && <Secrets ask={ask} joke={joke} popup={popup} reveal={reveal}/>}
    {section?.[1] === '/assets' && <InventoryPage/>}
    {section?.[1] === '/referrals' && referrals}
  </>;
}
function Secrets({ ask, joke, popup, reveal }: { ask: () => void; joke: boolean; popup: boolean; reveal: () => void }) {
  const { hash, pathname, state } = useLocation();
  const keepParent = state?.guideDetail === true;
  const tab = pathname === '/secrets/achievements' ? 'achievement' : 'secret';
  const selected = tab === 'secret' && hash.startsWith('#sticker-') ? Number(hash.slice(9)) : null;
  const { completed, collected, percentages, setMark } = useProgress();
  const isDone = (id: number) => completed.includes(id) || collected.includes(id);
  const items = (all as Item[]).filter(item => item.kind === tab);
  const groups = [
    { title: 'Осталось', items: items.filter(item => !isDone(item.id)) },
    { title: 'Выполнено', items: items.filter(item => isDone(item.id)) },
  ];
  const wasLocked = useRef(!joke);
  useEffect(() => {
    if (!joke || selected === null || !wasLocked.current) return;
    wasLocked.current = false;
    document.getElementById(`sticker-${selected}`)?.scrollIntoView({ block: 'nearest' });
  }, [joke, selected]);
  return <>
    <p className="intro">Скрытые действия и обычные достижения открывают стикеры для альбомов.</p>
    <div className="choiceBar profileTabs" aria-label="Способ получения">
      <Link to="/secrets" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={tab === 'secret' ? 'page' : undefined}><GameGlyph name="lock"/>Секреты</Link>
      <Link to="/secrets/achievements" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={tab === 'achievement' ? 'page' : undefined}><GameGlyph name="treasure"/>Достижения</Link>
    </div>
    {tab === 'secret' && !joke ? <Card>
      <h2>20 скрытых заданий</h2>
      <p>Открой список, чтобы увидеть действия и награды.</p>
      <button className="primary" onClick={ask}>Открыть секреты</button>
    </Card> : <Card>
      <div className="progressCounts"><strong>{groups[1].items.length}/{items.length} выполнено</strong><span>Осталось {groups[0].items.length}</span></div>
      <ProgressStatus/>
      {tab === 'secret' && percentages && <p className="caption">Проценты показывают долю игроков, отметивших секрет в гайде.</p>}
      {groups.filter(group => group.items.length).map(group => <section className="progressGroup" key={group.title}>
        <h2>{group.title}</h2>
        {group.items.map(item => {
        const quest = quests.secret_quests.find(row => row.key === item.key);
        const title = item.name_ru || (quest?.name.match(/\((.+)\)/)?.[1] ?? item.name);
        return <article className="secretRow" id={`sticker-${item.id}`} key={item.id} data-selected={selected === item.id}>
          <GameArt path={`/game/stickers/${item.id}.webp`} size={42}/>
          <div><h3>{title}</h3><small>{title !== item.name ? item.name + ' · ' : ''}Стикер №{item.id}</small>
            <p>{tab === 'achievement' ? achievementActions[item.id] : quest?.action ?? 'Точное условие пока не подтверждено.'}</p>
            {tab === 'secret' && percentages && <small>Отметили {percentages[item.id] ?? 0}% игроков</small>}
          </div>
          <label className="secretCheck" title="Выполнено"><input type="checkbox" checked={isDone(item.id)} onChange={event => setMark('completed', item.id, event.target.checked)}/><span className="sr-only">Выполнено: {title}</span></label>
        </article>;
        })}
      </section>)}
      {tab === 'secret' && <DetailLink className="textLink" to="/support">Поддержать проект</DetailLink>}
    </Card>}
    {popup && <SecretDialog reveal={reveal}/>}
  </>;
}
function RevealedSecrets({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useModal(dialog, true);
  return <dialog className="modal" ref={dialog} aria-labelledby="secret-reveal-title"
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="dialogBody">
      <div className="tokenRatesDialogHeader">
        <h2 id="secret-reveal-title" data-dialog-title tabIndex={-1}>Ладно, пошутили 😄</h2>
        <button className="close" aria-label="Закрыть" onClick={close}>×</button>
      </div>
      <p>Все секреты бесплатны.</p>
      <button className="primary" onClick={close}>К секретам</button>
      <DetailLink className="secondary" to="/support" onClick={close}>Поддержать проект</DetailLink>
    </div>
  </dialog>;
}
function SecretDialog({reveal}: {reveal: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useModal(dialog, true);
  return <dialog className="modal" ref={dialog} aria-labelledby="modalTitle" onCancel={event => {event.preventDefault();reveal();}}
    onClick={event => { if (event.target === event.currentTarget) reveal(); }}>
    <div className="dialogBody">
      <div className="tokenRatesDialogHeader">
        <h2 id="modalTitle" data-dialog-title tabIndex={-1}>Секреты Not Wise</h2>
        <button className="close" onClick={reveal} aria-label="Закрыть окно">×</button>
      </div>
      <p>Заплати 1 ⭐ (Telegram Stars), чтобы открыть все секреты</p>
      <button className="primary" onClick={reveal}>Заплатить</button>
      <button className="secondary" onClick={reveal}>Назад</button>
    </div>
  </dialog>;
}
export {App};

