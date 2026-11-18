import { artSrc } from '../ui/warmArt';
import { SquadPage } from '../features/SquadPage';
import { ReferralsPage } from '../features/ReferralsPage';
import { SupportPage } from '../features/SupportPage';
import { OwlPrices } from '../features/OwlPrices';
import { EcosystemPage } from '../features/EcosystemPage';
import { TokenTicker } from '../features/TokenQuotes';
import { GameArt } from '../ui/GameArt';
import { InventoryPage, OwlPage } from '../features/InventoryPage';
import { CombatPage } from '../features/CombatPage';
import { CollectionPage } from '../features/CollectionPage';
import { CapsulePage } from '../features/CapsulePage';
import { achievementActions } from '../features/inventory';
import {useEffect,useRef,useState}from'react';
import{Link,useLocation,useNavigate}from'react-router';
import{AnimatePresence,motion}from'motion/react';
import all from'../../public/data/all_100_stickers.json';import quests from'../../public/data/secret_quests.json';import{impactHaptic,lightHaptic,telegramPopup}from'../telegram/client';
import { useGuideNavigation, useGuideScroll } from './navigation';
import { DockCoach } from './DockCoach';
import { AdminPage } from '../features/AdminPage';
import { authData, defaultGameLink, guideShareUrl, profileRequest, shareGuide, type GuideProfile } from '../features/guideProfile';

const sections = [
  ['Сквады и войны', '/squads'],
  ['Секреты', '/secrets'], ['Капсулы', '/capsules'], ['Яйца и совы', '/owl'],
  ['Коллекции', '/collections'], ['Бои и навыки', '/combat'], ['Инвентарь', '/assets'],
  ['Экосистема', '/ecosystem'], ['Пригласить друзей', '/referrals'],
] as const;
type Item={id:number;name:string;description:string;short_descr:string;rarity:number;kind?:string;key?:string};
function App() {
  const loc = useLocation();
  const nav = useNavigate();
  const [hamster, setHamster] = useState(false);
  const [hamsterLocked, setHamsterLocked] = useState(false);
  const [coach, setCoach] = useState(() => localStorage.getItem('notwise.guide.dock.v1') !== '1');
  const [joke, setJoke] = useState(localStorage.getItem('notwise.guide.secrets.v1') === '1' || sessionStorage.getItem('notwise.guide.secrets.v1') === '1');
  const [showJoke, setShowJoke] = useState(false);
  const [popup, setPopup] = useState(false);
  const [profile, setProfile] = useState<GuideProfile | null>(null);
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
  const closeCoach = () => {
    localStorage.setItem('notwise.guide.dock.v1', '1');
    setCoach(false);
  };
  useGuideScroll();
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
return <div className={"shell "+(loc.pathname==='/'?'homeShell':'')}><header inert={hamster || coach}><Link to="/" className="brand"><img src="/brand/notwise.svg" alt=""/><span>NOT WISE <i>GUIDE</i></span></Link>{loc.pathname === '/' && <TokenTicker/>}</header><main key={loc.pathname} inert={hamster || coach}>{loc.pathname === '/' ? <Home profile={profile} profileFailed={profileFailed} retryProfile={() => {
  setProfileFailed(false); setProfileAttempt(value => value + 1);
}}/> : loc.pathname === '/admin' ? <AdminPage profile={profile}/> : <Page ask={ask} joke={joke} popup={popup} reveal={reveal}
  referrals={<ReferralsPage profile={profile} failed={profileFailed} onSave={setProfile} onRetry={() => {
    setProfileFailed(false);
    setProfileAttempt(value => value + 1);
  }}/>}/>}</main>{coach && !hamster && <><div className="dockCoachTint" aria-hidden="true"/><DockCoach onClose={closeCoach}/></>}{showJoke && loc.pathname === '/secrets' && <aside className="card jokeToast" role="status">
  <strong>Ладно, пошутили 😄 Секреты бесплатны.</strong>
  <div><Link className="textLink" to="/support" onClick={() => setShowJoke(false)}>Поддержать проект</Link>
  <button className="secondary" onClick={() => setShowJoke(false)}>К секретам</button></div>
</aside>}<Dock onGesture={coach ? closeCoach : undefined} hamster={hamster} locked={hamsterLocked} onHamster={() => {
  if (hamsterLocked) return;
  if (hamster) {
    setHamster(false);
  } else {
    setHamsterLocked(true);
    setHamster(true);
  }
}}/>
<AnimatePresence>{hamster && <motion.button className="hamsterShade" aria-label="Спрятать хомяка" disabled={hamsterLocked}
  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setHamster(false)}/>}</AnimatePresence>
<AnimatePresence>{hamster && <motion.aside className="hamster" role="status"
  initial={{y:110,opacity:0}} animate={{y:0,opacity:1}} exit={{y:110,opacity:0}} transition={{duration:.22}}>
  <p className="hamsterSpeech">*#$@#, себя потыкай %*!</p>
  <img src={artSrc('/brand/hamster.png')} width="1264" height="1371" alt="Хомяк CryptoOne"/>
</motion.aside>}</AnimatePresence></div>}
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
          window.scrollTo(0, 0);
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
      <img src="/brand/cryptoone.svg" width="32" height="33" alt=""/>
    </button>
  </nav>;
}
function Home({ profile, profileFailed, retryProfile }: {
  profile: GuideProfile | null; profileFailed: boolean; retryProfile: () => void;
}) {
 const fromInvite = authData() && /^g_[a-f0-9]{32}$/.test(telegramPopup()?.initDataUnsafe?.start_param ?? '');
 const tiles = [
  ['Секреты', '/secrets', '/game/stickers/9.webp', 'Скрытые условия и достижения', '/game/stickers/42.webp'],
  ['Капсулы', '/capsules', '/game/capsules/gold.webp', 'Что выпадет и сколько стоит открыть сейчас?', '/game/capsules/silver.webp'],
  ['Яйца и совы', '/owl', '/game/items/egg.webp', 'Что выпадет из яйца и когда кормить?', '/game/items/golden-egg.webp'],
  ['Коллекции', '/collections', '/game/albums/1.webp', 'Стикеры, альбомы и Getgems', '/game/stickers/1.webp'],
  ['Бои и навыки', '/combat', '/game/skills/1.png', 'Какие навыки выбрать и что качать?', '/game/skills/16.png'],
  ['Инвентарь', '/assets', '/game/items/ring-wit-3.webp', 'Предметы и скины', '/game/items/book.webp'],
  ['Сквады и войны', '/squads', '/game/items/lighter.webp', 'Ритуалы, осады и награды', '/game/war/siege-header.webp'],
  ['Экосистема', '/ecosystem', '/game/items/coins.webp', 'Токены, проекты и курсы', '/brand/tokens/gram.png'],
  ['Пригласить друзей', '/referrals', '/game/items/wise-coin.webp', 'Твоя ссылка и список приглашённых', '/game/items/referral-egg.webp'],
 ] as const;
 return <>
  <section className="gameHero">
    <div className="heroCopy"><h1>Гайд по Not Wise</h1><p className="heroSub">Награды, бои и уход за совой.</p></div>
    <img className="heroImage" src={artSrc('/brand/notwise-home.jpg')} width="1170" height="1200" alt=""/>
    <div className="heroActions">
      {fromInvite && !profile ? <button className="primary" disabled={!profileFailed} onClick={retryProfile}>
        {profileFailed ? 'Повторить проверку' : 'Проверяем приглашение…'}
      </button> : <a className="primary" href={profile?.gameEntry ?? defaultGameLink}>Открыть игру</a>}
      <a className="secondary" href="https://t.me/notgames_bot/squads?startapp=575801">
        <span className="squadMark" aria-hidden="true"/>Наш сквад
      </a>
    <button className="heroShare secondary" onClick={() => shareGuide(guideShareUrl())}>Поделиться гайдом</button>
    </div>
  </section>
  <OwlPrices/>
  <div className="sectionHeading"><div><h2>Что ищешь?</h2></div></div>
  <div className="guideGrid">{tiles.map(([name, path, icon, description, art]) =>
    <Link to={path} className="guideTile" key={path}>
      <img className="guideTileArt" src={artSrc(art)} alt="" width="108" height="108"/>
      {icon ? <GameArt path={icon} size={48}/> : <span className="guideFrensIcon" aria-hidden="true"/>}
      <span className="tileText"><b>{name}</b><small>{description}</small></span>
    </Link>
  )}</div>
  <div className="supportFooter"><a className="supportPill" href="https://t.me/cryptoeone"><img className="channelLogo" src="/brand/cryptoone-channel.jpg" alt="" width="24" height="24"/>Канал CryptoOne</a><Link className="supportPill" to="/support"><img src="/brand/cryptoone.svg" alt="" width="18" height="19"/>Поддержать проект</Link></div>
  {profile?.isAdmin && <Link className="textLink" to="/admin">Управление гайдом</Link>}
 </>;
}
function Card({children}:{children:React.ReactNode}){return <section className="card">{children}</section>}
function Page({ ask, joke, popup, reveal, referrals }: {
  ask: () => void; joke: boolean; popup: boolean; reveal: () => void; referrals: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const section = sections.find(([, path]) => pathname === path || pathname.startsWith(path + '/'));
  if (!section && pathname !== '/support') return <Card>
    <h1>Страница не найдена</h1><Link className="textLink" to="/">На главную</Link>
  </Card>;
  return <>
    <h1 className="pageTitle">{section?.[0] ?? 'Поддержать проект'}</h1>
    {section?.[1] === '/capsules' && <CapsulePage/>}
    {section?.[1] === '/owl' && <OwlPage/>}
    {section?.[1] === '/collections' && <CollectionPage/>}
    {section?.[1] === '/ecosystem' && <EcosystemPage/>}
    {section?.[1] === '/combat' && <CombatPage/>}
    {section?.[1] === '/squads' && <SquadPage/>}
    {section?.[1] === '/secrets' && <Secrets ask={ask} joke={joke} popup={popup} reveal={reveal}/>}
    {section?.[1] === '/assets' && <InventoryPage/>}
    {section?.[1] === '/referrals' && referrals}
    {pathname === '/support' && <SupportPage/>}
  </>;
}
function Secrets({ ask, joke, popup, reveal }: { ask: () => void; joke: boolean; popup: boolean; reveal: () => void }) {
  const { hash } = useLocation();
  const [tab, setTab] = useState<'secret' | 'achievement'>('secret');
  const selected = tab === 'secret' && hash.startsWith('#sticker-') ? Number(hash.slice(9)) : null;
  const [completed, setCompleted] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('notwise.guide.completed') ?? '[]'); }
    catch { return []; }
  });
  function toggleCompleted(id: number) {
    const next = completed.includes(id) ? completed.filter(value => value !== id) : [...completed, id];
    setCompleted(next);
    localStorage.setItem('notwise.guide.completed', JSON.stringify(next));
  }
  const items = (all as Item[]).filter(item => item.kind === tab);
  useEffect(() => {
    if (!joke || selected === null) return;
    document.getElementById(`sticker-${selected}`)?.scrollIntoView({ block: 'nearest' });
  }, [joke, selected]);
  return <>
    <p className="intro">Скрытые действия и обычные достижения открывают стикеры для альбомов.</p>
    <div className="choiceBar" aria-label="Способ получения">
      <button aria-pressed={tab === 'secret'} onClick={() => setTab('secret')}>Секреты</button>
      <button aria-pressed={tab === 'achievement'} onClick={() => setTab('achievement')}>Достижения</button>
    </div>
    {tab === 'secret' && !joke ? <Card>
      <h2>20 скрытых заданий</h2>
      <p>Открой список, чтобы увидеть действия и награды.</p>
      <button className="primary" onClick={ask}>Открыть секреты</button>
    </Card> : <Card>
      {tab === 'secret' && <Link className="textLink" to="/support">Поддержать проект</Link>}
      {items.map(item => {
        const quest = quests.secret_quests.find(row => row.key === item.key);
        const title = quest?.name.match(/\((.+)\)/)?.[1] ?? item.name;
        return <article className="secretRow" id={`sticker-${item.id}`} key={item.id} data-selected={selected === item.id}>
          <GameArt path={`/game/stickers/${item.id}.webp`} size={42}/>
          <div><h3>{title}</h3><small>{title !== item.name ? item.name + ' · ' : ''}Стикер №{item.id}</small>
            <p>{tab === 'achievement' ? achievementActions[item.id] : quest?.action ?? 'Точное условие пока не подтверждено.'}</p>
          </div>
          <label className="secretCheck" title="Выполнено"><input type="checkbox" checked={completed.includes(item.id)} onChange={() => toggleCompleted(item.id)}/><span className="sr-only">Выполнено: {title}</span></label>
        </article>;
      })}
    </Card>}
    {popup && <SecretDialog reveal={reveal}/>}
  </>;
}
function SecretDialog({reveal}: {reveal: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog className="modal" ref={dialog} aria-labelledby="modalTitle" onCancel={event => {event.preventDefault();reveal();}}>
    <button className="close" onClick={reveal} aria-label="Закрыть окно">×</button>
    <h2 id="modalTitle">Секреты Not Wise</h2>
    <p>Заплати 1 ⭐ (Telegram Stars), чтобы открыть все секреты</p>
    <button className="primary" onClick={reveal}>Заплатить</button>
    <button className="secondary" onClick={reveal}>Назад</button>
  </dialog>;
}
export {App};

