import { artSrc } from '../ui/warmArt';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { TokenQuotes } from './TokenQuotes';
import tokens from '../../public/data/tokens.json';

type ProjectLink = { label: string; href: string };
type Project = {
  id: string;
  name: string;
  logo?: string;
  description: string;
  status?: string;
  token?: string;
  links: ProjectLink[];
};

const projects: Project[] = [
  {
    id: 'notwise', name: 'NOT Wise', logo: 'notwise.jpg',
    description: 'Игра в Telegram и сообщество коллекционеров. Выращивай сову, сражайся и собирай предметы и стикеры.',
    links: [
      { label: 'Сайт', href: 'https://notwise.org' },
      { label: 'Игра', href: 'https://t.me/notwise_bot/thegame' },
      { label: 'Канал', href: 'https://t.me/notwise' },
      { label: 'Чат', href: 'https://t.me/notwise_chat' },
      { label: 'X', href: 'https://x.com/NotWiseOrg' },
    ],
  },
  {
    id: 'grouche', name: 'Grouche', logo: 'grouche.png', token: 'GRC',
    description: 'Благотворительная платформа на TON. Здесь можно открыть сбор или поддержать уже опубликованную инициативу.',
    links: [
      { label: 'Сайт', href: 'https://www.grouche.com/en' },
      { label: 'Бот', href: 'https://t.me/grouche_bot/miniapp' },
      { label: 'Канал', href: 'https://t.me/grouche_coin' },
      { label: 'Чат', href: 'https://t.me/grouche_chat' },
      { label: 'X', href: 'https://x.com/grouchecoin' },
      { label: 'Grouche Pears', href: 'https://getgems.io/collection/EQCdpND6kJ8O7KFfHfIiqY75MBuFkpX2jdBrRDnlFGpp97QQ' },
    ],
  },
  {
    id: 'pew', name: 'PEW', logo: 'pew.png', token: 'PEW',
    description: 'Протокол кредитования на TON. Позволяет брать займы под залог поддерживаемых NFT и пополнять пул кредитования.',
    links: [
      { label: 'Приложение', href: 'https://app.pew.tg' },
      { label: 'Канал', href: 'https://t.me/pewtg' },
    ],
  },
  {
    id: 'talents', name: 'Talents', logo: 'talents.png', token: 'TNT',
    description: 'Биржа фриланса на TON для поиска работы и найма. Бюджет сделки хранится в смарт-контракте до приёмки этапа.',
    links: [
      { label: 'Сайт', href: 'https://www.talents.tg/en' },
      { label: 'Канал', href: 'https://t.me/tontalents' },
      { label: 'Чат', href: 'https://t.me/talentstg_chat' },
    ],
  },
  {
    id: 'lotsy', name: 'Lotsy', logo: 'lotsy.png',
    description: 'Аукционный маркетплейс на TON. На витрине можно посмотреть лоты и условия торгов.',
    links: [
      { label: 'Сайт', href: 'https://lotsy.io' },
      { label: 'Канал', href: 'https://t.me/lotsyio' },
    ],
  },
  {
    id: 'bookaboo', name: 'Bookaboo', status: 'Скоро',
    description: 'Проект в списке анонсов. Сайт и подробности пока не подтверждены.',
    links: [],
  },
];

export function EcosystemPage() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash.startsWith('#token-')) return;
    const target = document.getElementById(hash.slice(1));
    if (target instanceof HTMLDetailsElement) target.open = true;
  }, [hash]);
  return <>
    <section className="projectSection" aria-labelledby="ecosystem-projects">
      <h2 id="ecosystem-projects">Проекты экосистемы</h2>
      {projects.map(project => (
        <article className="card projectCard" key={project.id} aria-labelledby={`project-${project.id}`}>
          <div className="projectHeading">
            {project.logo
              ? <img className="projectLogo" src={artSrc(`/brand/projects/${project.logo}`)} alt="" width="52" height="52"/>
              : <span className="projectLogo projectPlaceholder" aria-hidden="true">📚</span>}
            <div>
              <h3 id={`project-${project.id}`}>{project.name}</h3>
              {project.status && <small>{project.status}</small>}
            </div>
          </div>
          <p>{project.description}</p>
          {(project.links.length > 0 || project.token) && <div className="projectLinks">
            {project.links.map(({ label, href }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={`${label} · ${project.name}`}>{label}</a>
            ))}
            {project.token && <Link to={`#token-${project.token}`}>Токен {project.token}</Link>}
          </div>}
        </article>
      ))}
    </section>
    <TokenQuotes/>
    <section className="card">
      <h2>Токены экосистемы</h2>
      {tokens.tokens.map(token => <details key={token.symbol} id={`token-${token.symbol}`}>
        <summary><b className="gold">${token.symbol}</b> · {token.name}</summary>
        <p>{token.role}</p>
        {'in_game_utility' in token && <p>{token.in_game_utility}</p>}
        {token.master_address && <small className="address">{token.master_address}</small>}
        {token.dex?.map(({ name, url }) => <div key={url}><a className="textLink" href={url} target="_blank" rel="noreferrer">{name}</a></div>)}
      </details>)}
    </section>
    <section className="card">
      <h2>Коллекции NOT Wise</h2>
      <p>Owlings, Eggs, Merch и домены *.notwise.ton относятся к коллекциям.</p>
      <div className="projectLinks">
        <Link to="/collections">Каталог гайда</Link>
        <a href="https://getgems.io/notwise" target="_blank" rel="noreferrer">Getgems</a>
        <a href="https://opensea.io/collection/notwise" target="_blank" rel="noreferrer">OpenSea</a>
      </div>
    </section>
  </>;
}
