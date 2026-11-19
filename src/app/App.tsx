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
import { ArtifactInfoModal } from '../features/ArtifactInfoModal';
import { CombatPage, ModesPage } from '../features/CombatPage';
import { CollectionPage } from '../features/CollectionPage';
import { CapsulePage } from '../features/CapsulePage';
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
  ['Кормление', '/care'], ['Режимы игры', '/modes'],
] as const;
type Item={id:number;name:string;description:string;short_descr:string;rarity:number;kind?:string;key?:string};
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
}, [hamster, hamsterLocked]);useEffect(()=>{telegramPopup()?.ready();const key='notwise.guide.startapp.v1';if(sessionStorage.getItem(key))return;const start=new URLSearchParams(location.search).get('startapp')??telegramPopup()?.initDataUnsafe?.start_param;const routes:Record<string,string>={capsules_gold:'/capsules/gold',eggs:'/owl',secrets:'/secrets',market:'/collections/market'};if(start&&Object.hasOwn(routes,start)){sessionStorage.setItem(key,'1');nav(routes[start],{replace:true})}},[nav]);const ask=()=>{lightHaptic();const tg=telegramPopup();if(tg?.showPopup){try { tg.showPopup({title:'Секреты Not Wise',message:'Заплати 1 ⭐ (Telegram Stars), чтобы открыть все секреты',buttons:[{id:'pay',text:'Заплатить',type:'default'},{id:'back',text:'Назад',type:'default'}]},()=>reveal()); return; } catch { /* Older Telegram clients use the local dialog. */ }}setPopup(true)};function reveal(){setPopup(false);setJoke(true);setShowJoke(true);localStorage.setItem('notwise.guide.secrets.v1','1')}
return <GuideProgress user={profile?.userId}><div className={"shell "+(loc.pathname==='/'?'homeShell':'')}><header inert={hamster || coach !== null}><Link to="/" className="brand"><img src={artSrc('/brand/notwise.svg')} alt=""/><span>NOT WISE <i>GUIDE</i></span></Link>{loc.pathname === '/' && <TokenTicker/>}</header><main className="guideScreen" key={loc.pathname} inert={hamster || coach !== null}>{loc.pathname === '/' ? <Home onChatVisit={awards.noteChatVisit} english={english} profile={profile} profileFailed={profileFailed} retryProfile={() => {
  setProfileFailed(false); setProfileAttempt(value => value + 1);
}}/> : <div className="guidePageContent">{loc.pathname === '/admin' ? <AdminPage profile={profile}/> : loc.pathname === '/support' || loc.pathname.startsWith('/support/') ?
  <SettingsPage profile={profile} earned={awards.earned}/> : <div lang="ru"><Page profile={profile} ask={ask} joke={joke} popup={popup} reveal={reveal}
  referrals={<ReferralsPage profile={profile} failed={profileFailed} onSave={next => { setProfile(next); void awards.update().catch(() => {}); }} onRetry={() => {
    setProfileFailed(false);
    setProfileAttempt(value => value + 1);
  }}/>}/></div>}</div>}</main><AwardToast award={awards.toast}/>{coach && !hamster && <><div className="dockCoachTint" aria-hidden="true"/><DockCoach step={coach} onContinue={advanceCoach}/></>}{showJoke && loc.pathname === '/secrets' && <RevealedSecrets close={() => setShowJoke(false)}/>}<Dock onGesture={coach ? advanceCoach : undefined} hamster={hamster} locked={hamsterLocked} onHamster={() => {
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
function Home({ profile, profileFailed, retryProfile, onChatVisit, english: en }: {
  english: boolean; profile: GuideProfile | null; profileFailed: boolean; retryProfile: () => void; onChatVisit: () => void;
}) {
 const [share, setShare] = useState(false);
 const fromInvite = authData() && /^g_[a-f0-9]{32}$/.test(telegramPopup()?.initDataUnsafe?.start_param ?? '');
 const titles = [
   ['Secrets', 'Hidden quests and achievements'], ['Capsules', 'Loot odds and opening costs'],
   ['Eggs and skins', 'Egg drops, skins and tokens'], ['Collections', 'Stickers and Getgems'],
   ['Combat and skills', 'Stats, game modes and builds'], ['Items', 'Food, rings and décor'],
   ['Squads and wars', 'Rituals, sieges and rewards'], ['Ecosystem', 'Projects and token prices'],
   ['Invite friends', 'Your links and invitations'],
 ] as const;
 const tiles = [
  ['Секреты', '/secrets', '/game/stickers/9.webp', 'Скрытые условия и достижения', '/game/stickers/42.webp'],
  ['Капсулы', '/capsules', '/game/capsules/gold.webp', 'Что выпадет и сколько стоит открыть сейчас?', '/game/capsules/silver.webp'],
  ['Яйца и скины', '/owl', '/game/items/egg.webp', 'Дроп, облики сов и жетоны', '/game/skins/5565.svg'],
  ['Коллекции', '/collections', '/game/albums/1.webp', 'Стикеры, альбомы и Getgems', '/game/stickers/1.webp'],
  ['Бои и навыки', '/combat', '/game/skills/1.png', 'Какие навыки выбрать и что качать?', '/game/skills/16.png'],
  ['Предметы', '/assets', '/game/items/ring-wit-3.webp', 'Еда, кольца и оформление', '/game/items/book.webp'],
  ['Сквады и войны', '/squads', '/game/items/lighter.webp', 'Ритуалы, осады и награды', '/game/war/siege-header.webp'],
  ['Экосистема', '/ecosystem', '/brand/notwise.svg', 'Токены, проекты и курсы', '/brand/projects/grouche.png'],
  ['Пригласить друзей', '/referrals', '/game/items/wise-coin.webp', 'Твоя ссылка и список приглашённых', '/game/items/referral-egg.webp'],
 ] as const;
 return <>
  <section className="gameHero">
    <div className="heroCopy"><h1>{en ? <>NOT Wise <span>Guide</span></> : <>Гайд по <span>NOT Wise</span></>}</h1><p className="heroSub">{en ? 'Loot, combat and owl care.' : 'Награды, бои и уход за совой.'}</p></div>
    <img className="heroImage" src={artSrc('/brand/notwise-home.jpg')} width="1170" height="1200" alt=""/>
    <div className="heroActions">
      {fromInvite && !profile ? (
        <button className="primary openGame" disabled={!profileFailed} onClick={retryProfile}>
          {profileFailed ? (en ? 'Retry' : 'Повторить проверку') : (en ? 'Checking invitation…' : 'Проверяем приглашение…')}
        </button>
      ) : (
        <a className="primary openGame" href={profile?.gameEntry ?? defaultGameLink} onClick={() => trackGuide('action:game')}>
          <span className="launchMark" aria-hidden="true"/>
          {en ? 'Open the game' : 'Открыть игру'}
        </a>
      )}
      <Link className="secondary heroBuilds" to="/combat/builds" onClick={() => { lightHaptic(); (trackGuide as (e: string) => void)('action:builds'); }}>
        <GameGlyph name="fight"/>
        <span>{en ? 'Builds' : 'Собрать билд'}</span>
        <span className="heroBadge">{en ? 'Beta' : 'В разработке'}</span>
      </Link>
      <a className="secondary" href={squadLink} onClick={() => trackGuide('action:squad')}>
        <span className="squadMark" aria-hidden="true"/>
        {en ? 'Our squad' : 'Наш сквад'}
      </a>
      <button className="heroShare secondary" aria-haspopup="dialog" onClick={() => { lightHaptic(); setShare(true); }}>
        <GameGlyph name="share"/>
        {en ? 'Share guide' : 'Поделиться гайдом'}
      </button>
    </div>
  </section>
  {share && <ShareDialog english={en} close={() => setShare(false)}/>}
  <OwlPrices/>
  <section className="homeGameActions" aria-label={en ? 'Gameplay' : 'Об игре'}>
    <Link to="/modes"><GameArt path="/game/ui/fight-vs.png" size={34}/><span>{en ? 'Game modes' : 'Режимы игры'}</span><span className="rowChevron" aria-hidden="true"/></Link>
    <Link to="/care"><GameArt path="/game/items/croissant.webp" size={34}/><span>{en ? 'Feeding' : 'Кормление'}</span><span className="rowChevron" aria-hidden="true"/></Link>
  </section>
  <div className="sectionHeading"><div><h2>{en ? 'Explore' : 'Что ищешь?'}</h2></div></div>
  <div className="guideGrid">{tiles.map(([name, path, icon, description, art], index) =>
    <Link to={path} className="guideTile" key={path}>
      <img className="guideTileArt" src={artSrc(art)} alt="" width="108" height="108"/>
      <span className="guideTileIcon">{path === '/collections' ? <AlbumLogo id={1} size={44}/> : <GameArt path={icon} size={40}/>}</span>
      <span className="tileText"><b>{en ? titles[index][0] : name}</b><small>{en ? titles[index][1] : description}</small></span>
    </Link>
  )}</div>
  <div className="supportFooter"><a className="supportPill" href={channelInvite} onClick={() => trackGuide('action:channel')}><img className="channelLogo" src={artSrc('/brand/cryptoone-channel.jpg')} alt="" width="24" height="24"/>{en ? 'CryptoOne channel' : 'Канал CryptoOne'}</a><a className="supportPill" href={communityChat} onClick={() => { onChatVisit(); trackGuide('action:chat'); }}><GameGlyph name="chat"/>{en ? 'Join the chat' : 'Присоединиться к чату'}</a><Link className="supportPill" to="/support"><GameGlyph name="settings"/>{en ? 'Settings' : 'Настройки'}</Link></div>
  {profile?.isAdmin && <Link className="textLink" to="/admin">Управление гайдом</Link>}
 </>;
}
function ShareDialog({ close, english: en }: { close: () => void; english: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState('');
  const url = guideShareUrl();
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
function Page({ profile, ask, joke, popup, reveal, referrals }: {
  profile: GuideProfile | null;
  ask: () => void; joke: boolean; popup: boolean; reveal: () => void; referrals: React.ReactNode;
}) {
  const { pathname, hash, state } = useLocation();
  const [artifactModalOpen, setArtifactModalOpen] = useState(false);
  if (pathname === '/owl/care' || pathname === '/combat/modes') {
    return <Navigate to={(pathname === '/owl/care' ? '/care' : '/modes') + hash} state={state} replace/>;
  }
  const section = sections.find(([, path]) => pathname === path || pathname.startsWith(path + '/'));
  if (!section) return <Card>
    <h1>Страница не найдена</h1><Link className="textLink" to="/">На главную</Link>
  </Card>;
  return <>
    {section?.[1] === '/assets' ? (
      <div className="headingWithAction pageTitleWithAction">
        <h1 className="pageTitle">{section?.[0] ?? 'О проекте'}</h1>
        <button
          type="button"
          className="infoCircleBtn"
          aria-label="Справка по механике артефактов"
          onClick={() => {
            lightHaptic();
            setArtifactModalOpen(true);
          }}
        >
          i
        </button>
      </div>
    ) : (
      <h1 className="pageTitle">{section?.[0] ?? 'О проекте'}</h1>
    )}
    {section?.[1] === '/capsules' && <CapsulePage/>}
    {section?.[1] === '/owl' && <OwlPage/>}
    {section?.[1] === '/collections' && <CollectionPage/>}
    {section?.[1] === '/ecosystem' && <EcosystemPage gameEntry={profile?.gameEntry ?? defaultGameLink}/>}
    {section?.[1] === '/combat' && <CombatPage/>}
    {section?.[1] === '/modes' && <ModesPage/>}
    {section?.[1] === '/care' && <CarePage/>}
    {section?.[1] === '/squads' && <SquadPage gameEntry={profile?.gameEntry ?? defaultGameLink}/>}
    {section?.[1] === '/secrets' && <Secrets ask={ask} joke={joke} popup={popup} reveal={reveal}/>}
    {section?.[1] === '/assets' && <InventoryPage/>}
    {section?.[1] === '/referrals' && referrals}
    {section?.[1] === '/assets' && (
      <ArtifactInfoModal
        open={artifactModalOpen}
        onClose={() => setArtifactModalOpen(false)}
      />
    )}
  </>;
}
function Secrets({ ask, joke, popup, reveal }: { ask: () => void; joke: boolean; popup: boolean; reveal: () => void }) {
  const { hash, pathname } = useLocation();
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
      <Link to="/secrets" replace aria-current={tab === 'secret' ? 'page' : undefined}><GameGlyph name="lock"/>Секреты</Link>
      <Link to="/secrets/achievements" replace aria-current={tab === 'achievement' ? 'page' : undefined}><GameGlyph name="treasure"/>Достижения</Link>
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
        const title = quest?.name.match(/\((.+)\)/)?.[1] ?? item.name;
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
  return <dialog className="modal" ref={dialog} aria-labelledby="modalTitle" onCancel={event => {event.preventDefault();reveal();}}>
    <button className="close" onClick={reveal} aria-label="Закрыть окно">×</button>
    <h2 id="modalTitle" data-dialog-title tabIndex={-1}>Секреты Not Wise</h2>
    <p>Заплати 1 ⭐ (Telegram Stars), чтобы открыть все секреты</p>
    <button className="primary" onClick={reveal}>Заплатить</button>
    <button className="secondary" onClick={reveal}>Назад</button>
  </dialog>;
}
export {App};

