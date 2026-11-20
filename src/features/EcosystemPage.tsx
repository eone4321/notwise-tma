import { DetailLink } from '../ui/DetailLink';
import { trackGuide } from './guideAnalytics';
import { GameGlyph } from '../ui/GameGlyph';
import { artSrc } from '../ui/warmArt';
import { Link, useLocation } from 'react-router';
import { TokenQuotes } from './TokenQuotes';
import { useGuideLocale } from './guideLocale';
import tokens from '../../public/data/tokens.json';

type ProjectLink = { label: string; labelEn: string; href: string };
type Project = {
  id: string;
  name: string;
  logo?: string;
  description: string;
  descriptionEn: string;
  status?: string;
  statusEn?: string;
  token?: string;
  links: ProjectLink[];
};

const projects: Project[] = [
  {
    id: 'notwise', name: 'NOT Wise', logo: 'notwise.jpg',
    description: 'Игра в Telegram и сообщество коллекционеров. Выращивай сову, сражайся и собирай предметы и стикеры.',
    descriptionEn: 'Telegram game and collector community. Raise your owl, battle, and collect items and stickers.',
    links: [
      { label: 'Сайт', labelEn: 'Website', href: 'https://notwise.org' },
      { label: 'Канал', labelEn: 'Channel', href: 'https://t.me/notwise' },
      { label: 'Чат', labelEn: 'Chat', href: 'https://t.me/notwise_chat' },
      { label: 'X', labelEn: 'X', href: 'https://x.com/NotWiseOrg' },
    ],
  },
  {
    id: 'grouche', name: 'Grouche', logo: 'grouche.png', token: 'GRC',
    description: 'Благотворительная платформа на TON. Здесь можно открыть сбор или поддержать уже опубликованную инициативу.',
    descriptionEn: 'Charity platform on TON where you can launch a fundraiser or support an active cause.',
    links: [
      { label: 'Сайт', labelEn: 'Website', href: 'https://www.grouche.com/en' },
      { label: 'Бот', labelEn: 'Mini App', href: 'https://t.me/grouche_bot/miniapp' },
      { label: 'Канал', labelEn: 'Channel', href: 'https://t.me/grouche_coin' },
      { label: 'Чат', labelEn: 'Chat', href: 'https://t.me/grouche_chat' },
      { label: 'X', labelEn: 'X', href: 'https://x.com/grouchecoin' },
      { label: 'Grouche Pears', labelEn: 'Grouche Pears', href: 'https://getgems.io/collection/EQCdpND6kJ8O7KFfHfIiqY75MBuFkpX2jdBrRDnlFGpp97QQ' },
    ],
  },
  {
    id: 'pew', name: 'PEW', logo: 'pew.png', token: 'PEW',
    description: 'Протокол кредитования на TON. Позволяет брать займы под залог поддерживаемых NFT и пополнять пул кредитования.',
    descriptionEn: 'NFT lending protocol on TON. Borrow against supported NFTs or supply liquidity to the lending pool.',
    links: [
      { label: 'Приложение', labelEn: 'App', href: 'https://app.pew.tg' },
      { label: 'Канал', labelEn: 'Channel', href: 'https://t.me/pewtg' },
    ],
  },
  {
    id: 'talents', name: 'Talents', logo: 'talents.png', token: 'TNT',
    description: 'Биржа фриланса на TON для поиска работы и найма. Бюджет сделки хранится в смарт-контракте до приёмки этапа.',
    descriptionEn: 'Freelance marketplace on TON for hiring and finding work, with milestone escrow powered by smart contracts.',
    links: [
      { label: 'Сайт', labelEn: 'Website', href: 'https://www.talents.tg/en' },
      { label: 'Канал', labelEn: 'Channel', href: 'https://t.me/tontalents' },
      { label: 'Чат', labelEn: 'Chat', href: 'https://t.me/talentstg_chat' },
    ],
  },
  {
    id: 'lotsy', name: 'Lotsy', logo: 'lotsy.png',
    description: 'Аукционный маркетплейс на TON. На витрине можно посмотреть лоты и условия торгов.',
    descriptionEn: 'Auction marketplace on TON. Browse active lots and bidding terms on the storefront.',
    links: [
      { label: 'Сайт', labelEn: 'Website', href: 'https://lotsy.io' },
      { label: 'Канал', labelEn: 'Channel', href: 'https://t.me/lotsyio' },
    ],
  },
  {
    id: 'bookaboo', name: 'Bookaboo', status: 'Скоро', statusEn: 'Coming soon',
    description: 'Проект в списке анонсов. Сайт и подробности пока не подтверждены.',
    descriptionEn: 'Announced ecosystem project. Website and details are yet to be confirmed.',
    links: [],
  },
];

export function EcosystemPage({ gameEntry }: { gameEntry: string }) {
  const { hash, pathname, state } = useLocation();
  const keepParent = state?.guideDetail === true;
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const tab = pathname === '/ecosystem/quotes' ? 'quotes' :
    pathname === '/ecosystem/tokens' || hash.startsWith('#token-') ? 'tokens' : 'projects';
  return <>
    <nav className="choiceBar profileTabs ecosystemTabs" aria-label={en ? 'Ecosystem' : 'Экосистема'}>
      {([
        ['projects', '/ecosystem', en ? 'Projects' : 'Проекты', 'sparkles'],
        ['quotes', '/ecosystem/quotes', en ? 'Rates' : 'Курсы', 'treasure'],
        ['tokens', '/ecosystem/tokens', en ? 'Tokens' : 'Токены', 'inventory'],
      ] as const).map(([key, path, label, icon]) =>
        <Link key={key} to={path} replace state={keepParent ? { guideDetail: true } : undefined} aria-current={key === tab ? 'page' : undefined}><GameGlyph name={icon}/>{label}</Link>)}
    </nav>
    {tab === 'projects' && <section className="projectSection" aria-labelledby="ecosystem-projects">
      <h2 id="ecosystem-projects">{en ? 'Ecosystem projects' : 'Проекты экосистемы'}</h2>
      {projects.map(project => (
        <article className="card projectCard" key={project.id} aria-labelledby={`project-${project.id}`}>
          <div className="projectHeading">
            {project.logo
              ? <img className="projectLogo" src={artSrc(`/brand/projects/${project.logo}`)} alt="" width="52" height="52"/>
              : <span className="projectLogo projectPlaceholder" aria-hidden="true">📚</span>}
            <div>
              <h3 id={`project-${project.id}`}>{project.name}</h3>
              {project.status && <small>{en ? project.statusEn : project.status}</small>}
            </div>
          </div>
          <p>{en ? project.descriptionEn : project.description}</p>
          {(project.links.length > 0 || project.token) && <div className="projectLinks">
            {project.id === 'notwise' && <a href={gameEntry} onClick={() => trackGuide('action:game')}>{en ? 'Game' : 'Игра'}</a>}
            {project.links.map(({ label, labelEn, href }) => {
              const text = en ? labelEn : label;
              return <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={`${text} · ${project.name}`}>{text}</a>;
            })}
            {project.token && <DetailLink to={`/ecosystem/tokens#token-${project.token}`}>{en ? `${project.token} token` : `Токен ${project.token}`}</DetailLink>}
          </div>}
        </article>
      ))}
    </section>}
    {tab === 'quotes' && <TokenQuotes/>}
    {tab === 'tokens' && <section className="card">
      <h2>{en ? 'Ecosystem tokens' : 'Токены экосистемы'}</h2>
      {tokens.tokens.map(token => <details className="mediaDetails tokenContract" key={token.symbol} id={`token-${token.symbol}`} open={hash === `#token-${token.symbol}` || undefined}>
        <summary>
          <img src={artSrc(`/brand/tokens/${token.symbol === 'GRAM' ? 'gram.png' : token.symbol.toLowerCase() + '.webp'}`)} width="30" height="30" alt=""/>
          <span><strong>{token.symbol}</strong><small>{token.name}</small></span>
        </summary>
        <p>{en && 'role_en' in token ? token.role_en : token.role}</p>
        {'in_game_utility' in token && <p>{en && 'in_game_utility_en' in token ? token.in_game_utility_en : token.in_game_utility}</p>}
        {token.master_address && <div className="tokenAddress"><small>{en ? 'Contract address' : 'Адрес контракта'}</small><code>{token.master_address}</code></div>}
        <div className="projectLinks">{token.dex?.map(({ name, url }) =>
          <a key={url} href={url} target="_blank" rel="noreferrer">{en ? `Open on ${name}` : `Открыть на ${name}`}</a>)}</div>
      </details>)}
    </section>}
    {tab === 'projects' && <section className="card">
      <h2>{en ? 'NOT Wise collections' : 'Коллекции NOT Wise'}</h2>
      <p>{en ? 'Owlings, Eggs, Merch, and *.notwise.ton domains are listed under Collections.' : 'Owlings, Eggs, Merch и домены *.notwise.ton относятся к коллекциям.'}</p>
      <div className="projectLinks">
        <DetailLink to="/collections">{en ? 'Guide catalog' : 'Каталог гайда'}</DetailLink>
        <a href="https://getgems.io/notwise" target="_blank" rel="noreferrer">Getgems</a>
        <a href="https://opensea.io/collection/notwise" target="_blank" rel="noreferrer">OpenSea</a>
      </div>
    </section>}
  </>;
}
