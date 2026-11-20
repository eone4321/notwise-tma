import { DetailLink } from '../ui/DetailLink';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import skills from '../../public/data/skills.json';
import progression from './owl-progression.json';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { GameSymbol } from '../ui/GameSymbol';
import { GameArt } from '../ui/GameArt';
import { skillCopy } from './skill-copy';
import skillLevels from './skill-levels.json';
import { skillEffect } from './BattleReadout';
import { battleLeagues } from './battle-leagues';
import { skillHpMultiplier, skillCooldown, skillMana } from '../domain/combat';
import { BuildConstructor } from './BuildConstructor';
import { useGuideLocale } from './guideLocale';

export function SpBadge({ value }: { value?: number | string }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  return <span className="spBadge">
    {value !== undefined && <span className="spValue">{typeof value === 'number' ? value.toLocaleString(en ? 'en-US' : 'ru-RU') : value}</span>}
    <GameSymbol name="sp" size={14}/>
  </span>;
}

const branches = [
  ['wisdom', 'Мудрость', 'Критический удар и мана', 'Wisdom', 'Critical strike and mana'],
  ['strength', 'Сила', 'Урон по противнику', 'Strength', 'Attack damage'],
  ['agility', 'Ловкость', 'Уклонение и контроль', 'Agility', 'Dodge and control'],
  ['endurance', 'Выносливость', 'Здоровье и защита', 'Endurance', 'Health and defense'],
] as const;

const skillDescriptionsEn = [
  'Deals damage through both block and dodge.',
  'Empowers basic hits. Each empowered hit spends mana.',
  'Restores owl health.',
  'Reduces incoming damage. Each trigger spends mana.',
  'The opponent loses health on their next attacks while poisoned.',
  'Deals damage and freezes. A frozen opponent attacks twice as slowly.',
  'Temporarily prevents the opponent from attacking while still allowing them to block.',
  'Lets you dodge several incoming hits. Hits into your block do not spend charges.',
  'Reflects a portion of incoming hit damage back to the attacker.',
  'Reveals where the opponent moved their block. Each hint spends mana.',
  'Deals immediate damage and continues burning the opponent. Blocking does not extinguish the fire.',
  'Deals more damage the lower your health is. Costs health to cast but always leaves at least 1 HP.',
  'Unleashes a flurry of hits into the last targeted zone. A block in that zone stops the whole flurry.',
  'For 6 s each of your hits echoes and deals extra damage.',
  'Your next hit either deals 5× damage or deals no damage at all.',
  'Deals damage through block and dodge and stuns the opponent.',
  'Locks the opponent’s block in place and reveals which zone they are guarding.',
  'Your landed hits restore health proportional to the damage dealt.',
  'Weakens enemy control effects, poison, and super streak. Each trigger spends mana.',
  'Grants temporary invulnerability to all damage.',
] as const;

const modes = [
  { icon: 'swords', title: ['Рейтинговый бой', 'Ranked Battle'], subtitle: ['Рейтинг и капсулы', 'Rating and capsules'],
    guide: ['Целься в голову, корпус или живот. Удар в защищённую зону не наносит урона. Меняй свой блок, чтобы прикрыть зону, в которую бьёт соперник.', 'Aim for the head, chest, or belly. Hits into a guarded zone deal no damage. Switch your guard to cover the zone your opponent is targeting.'],
    rules: [
      ['Между атаками', 'Between attacks', '1,5с', '1.5s'],
      ['Между сменами блока', 'Between guard switches', '1с', '1s'],
      ['За победу', 'For winning', 'Шанс на капсулу при свободном слоте', 'Chance for a capsule with an open slot'],
    ] },
  { icon: 'target', title: ['Нападения', 'Raids'], subtitle: ['С 1-го уровня', 'From level 1'],
    guide: ['Выбери соперника в рейтинге. После трёх проигранных нападений подряд щит защищает игрока до следующего входа в игру.', 'Choose an opponent from the leaderboard. After three raid losses in a row, a shield protects the player until they log back in.'],
    rules: [['Победитель забирает', 'Winner takes', '3% монет проигравшего', '3% of the loser’s coins']] },
  { icon: 'boxing', title: ['Додзё', 'Dojo'], subtitle: ['Со 2-го уровня', 'From level 2'],
    guide: ['Бей манекен, чтобы заработать SP, и пробуй на нём навыки. Потрать SP на прокачку, а очки атрибутов вкладывай в ветки, чтобы открыть новые навыки.', 'Hit the dummy to earn SP and practise your skills. Spend SP on upgrades and invest attribute points in branches to unlock new skills.'],
    rules: [['Обычный удар', 'Basic hit', '2 ⚡ за удар', '2 ⚡ per hit']] },
  { icon: 'shield', title: ['Сквады и осады', 'Squads and Sieges'], subtitle: ['Сквады с 3-го ур. · осады с 4-го', 'Squads at level 3 · sieges at level 4'],
    guide: ['Захватывай и удерживай территории вместе со сквадом. Чтобы получить награду за раунд, вложи в атаку хотя бы 1 единицу мощи.', 'Capture and hold territories with your squad. Contribute at least 1 power to an attack to earn that round’s reward.'],
    rules: [
      ['Длительность осады', 'Siege duration', '3 раунда по 8ч.', '3 rounds of 8h'],
      ['Награды за территории', 'Territory rewards', 'Монеты, серебро или +1–2 к атрибуту на 24ч.', 'Coins, squad silver, or +1–2 to an attribute for 24h'],
    ] },
  { icon: 'rocket', title: ['Полёт', 'Flight'], subtitle: ['С 5-го уровня', 'From level 5'] },
  { icon: 'bolt', title: ['Wild Magic', 'Wild Magic'], subtitle: ['Тренировка заклинаний', 'Spell practice'],
    guide: ['Тренируй заклинания и старайся получить максимальную оценку.', 'Practise casting spells and aim for the highest score.'],
    rules: [['Достижение Spell Book', 'Spell Book achievement', 'Три максимальные оценки', 'Three top scores']] },
  { icon: 'magnifier', title: ['Книга загадок', 'Book of Riddles'], subtitle: ['60с на ответ', '60s to answer'],
    guide: ['Сотри защитный слой, чтобы увидеть загадку. Таймер запускается сразу, как открывается загадка.', 'Scratch off the cover to reveal the riddle. The timer starts when the riddle appears.'],
    rules: [
      ['За верный ответ', 'Correct answer', '+5 к мудрости на 24ч.', '+5 Wisdom for 24h'],
      ['Серия верных ответов', 'Correct answer streak', 'До ×3 монет и XP', 'Up to ×3 coins and XP'],
      ['Три ошибки', 'Three mistakes', 'Книга сгорает', 'The book burns up'],
    ] },
  { icon: 'trophy', title: ['Сезон', 'Season'], subtitle: ['14 дней', '14 days'],
    guide: ['В каждом сезоне одна дисциплина. В зачёт идут результаты, полученные за эти 14 дней.', 'Each season has one discipline. Only results earned during those 14 days count.'],
    rules: [
      ['Социальная активность', 'Social', 'Лайки', 'Likes'],
      ['Бои', 'Battles', 'Победы или победы без урона', 'Wins or flawless wins'],
      ['Полёт', 'Flight', 'Монеты, дистанция или лучший полёт', 'Coins, distance, or best flight'],
      ['Другие режимы', 'Other modes', 'Загадки или удары в Додзё', 'Riddles or Dojo hits'],
    ] },
] as const;

const formatRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const formatEn = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const preciseRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });
const preciseEn = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const hpEffects = new Set(['strike', 'heal', 'chill', 'desperate', 'meteor', 'poison', 'burn']);
const branchName = (branch: string, en = false) => {
  const found = branches.find(([id]) => id === branch);
  return found ? (en ? found[3] : found[1]) : '';
};
function unlockCondition(skill: Skill, en = false) {
  const previous = skills.find(item => item.branch === skill.branch && item.tier === skill.tier - 1);
  if (en) {
    return previous
      ? `After ${previous.name} · ${skill.tier} points in ${branchName(skill.branch, true)}`
      : `From owl level 2: invest 1 point in “${branchName(skill.branch, true)}”`;
  }
  return previous
    ? `После ${previous.name} · ${skill.tier} очк. в ветке «${branchName(skill.branch)}»`
    : `Со 2-го уровня совы: вложи 1 очко в «${branchName(skill.branch)}»`;
}
const skillArt = (id: number) => '/game/skills/' + id + '.png';
type Skill = typeof skills[number];

export function CombatPage({ referralCode }: { referralCode?: string }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const { pathname, search, state } = useLocation();
  const [, , page, branchId, skillId, extra] = pathname.split('/');
  const searchParams = new URLSearchParams(search);
  const tab = searchParams.get('tab');
  const isBuildsRequest = page === 'builds' || (!page && (tab === 'builds' || tab === 'build' || state?.tab === 'builds'));
  const isBuilds = isBuildsRequest && !branchId;
  const isStats = page === 'stats' && !branchId && !isBuilds;
  const isSkills = !page && !isBuilds && !isStats;
  const validPage = !page || page === 'builds' || page === 'stats' || page === 'skills';
  const branch = page === 'skills' && !isBuilds ? branches.find(item => item[0] === branchId) : undefined;
  const skill = page === 'skills' && !isBuilds && !extra && branch && skillId
    ? skills.find(item => String(item.id) === skillId && item.branch === branchId)
    : undefined;
  const badPage = !validPage
    || ((page === 'builds' || page === 'stats') && Boolean(branchId))
    || (page === 'skills' && (!branchId || !branch))
    || (page === 'skills' && Boolean(skillId) && (!skill || Boolean(extra)));
  const keepParent = state?.guideDetail === true;
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState<string>(() =>
    branches.some(([id]) => id === searchParams.get('branch')) ? searchParams.get('branch')! : 'wisdom',
  );
  const activeBranch = branches.find(item => item[0] === selectedBranch) ?? branches[0];
  const branchSkills = skills.filter(item => item.branch === activeBranch[0]).sort((a, b) => a.tier - b.tier);
  const openSkill = (id: number) => {
    const origin = branch ? '/combat/skills/' + branch[0] : '/combat' + (selectedBranch !== 'wisdom' ? '?branch=' + selectedBranch : '');
    navigate('/combat/skills/' + activeBranch[0] + '/' + id, { state: { guideDetail: true, parentPath: origin } });
  };
  return <>
    {!branch && !badPage && <nav className="choiceBar profileTabs combatTabs" aria-label={en ? 'Combat section' : 'Раздел боя'}>
      <Link to="/combat" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={isSkills ? 'page' : undefined}><GameGlyph name="lightning"/>{en ? 'Skills' : 'Навыки'}</Link>
      <Link to="/combat/stats" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={isStats ? 'page' : undefined}><GameGlyph name="shield"/>{en ? 'Attributes' : 'Атрибуты'}</Link>
      <Link to="/combat/builds" replace state={keepParent ? { guideDetail: true } : undefined} aria-current={isBuilds ? 'page' : undefined}><GameGlyph name="sparkles"/>{en ? 'Builds' : 'Билды'}</Link>
    </nav>}
    {badPage ? (
      <section className="card">
        <h2>{branch && skillId ? (en ? 'Skill not found' : 'Навык не найден') : (en ? 'Page not found' : 'Страница не найдена')}</h2>
        <Link className="textLink" to={skillId && state?.parentPath ? state.parentPath : branch && skillId ? `/combat/skills/${branch[0]}` : '/combat'} replace>
          {branch && skillId ? (en ? 'Back to branch' : 'Назад к ветке') : (en ? 'Back to combat' : 'К навыкам и боям')}
        </Link>
      </section>
    ) : isBuilds ? <BuildConstructor referralCode={referralCode}/> :
      skill ? <SkillDetail key={skill.id} skill={skill}/> :
      branch ? <section className="card skillShelf" aria-label={en ? branch[3] + ' skills' : 'Навыки · ' + branch[1]}>
          <header className="combatBranchHeading"><GameAttribute name={branch[0]}/><span><strong>{en ? branch[3] : branch[1]}</strong><small>{en ? branch[4] : branch[2]}</small></span></header>
          {skills.filter(item => item.branch === branch[0]).sort((a, b) => a.tier - b.tier).map(item => {
            const isPassive = item.type === 'passive';
            const cost = isPassive
              ? (en ? `Passive · ${skillMana(item.tier, true, item.id === 10)} mana` : `Пассивный · ${skillMana(item.tier, true, item.id === 10)} маны`)
              : (en ? `Active · ${skillMana(item.tier, false)} mana · ${skillCooldown(item.tier)} s cooldown` : `Активный · ${skillMana(item.tier, false)} маны · откат ${skillCooldown(item.tier)}с`);
            return <button type="button" onClick={() => openSkill(item.id)} className="mediaRow skillRow" key={item.id}>
              <span className="skillTile"><GameArt path={skillArt(item.id)} size={38}/><b aria-hidden="true">{item.tier}</b></span>
              <span><strong>{item.name}</strong><small>{cost}</small><small>{unlockCondition(item, en)}</small></span>
              <span className="rowChevron" aria-hidden="true"/>
            </button>;
          })}
        </section>
      : isStats ? <CombatStats/> : <>
        <p className="intro">{en
          ? <>From level 2, attribute points unlock skills in each branch. Bring up to three into battle and upgrade them with <SpBadge/> in the Dojo.</>
          : <>Со 2-го уровня очки атрибутов открывают навыки в ветках. В бой можно взять до трёх навыков, улучшать их — за <SpBadge/> в Додзе.</>}</p>
        <nav className="combatBranchTabs" aria-label={en ? 'Skill categories' : 'Категории навыков'}>
          {branches.map(([id, titleRu, , titleEn]) =>
            <button key={id} type="button" aria-pressed={selectedBranch === id} onClick={() => {
              setSelectedBranch(id);
              navigate('/combat' + (keepParent ? '?branch=' + id : ''), { replace: true, state: keepParent ? { guideDetail: true } : undefined });
            }}><GameAttribute name={id}/><span>{en ? titleEn : titleRu}</span></button>)}
        </nav>
        <section className="card skillShelf" aria-label={en ? activeBranch[3] + ' skills' : 'Навыки · ' + activeBranch[1]}>
          <header className="combatBranchHeading"><GameAttribute name={activeBranch[0]}/><span><strong>{en ? activeBranch[3] : activeBranch[1]}</strong><small>{en ? activeBranch[4] : activeBranch[2]}</small></span></header>
          {branchSkills.map(item => {
            const isPassive = item.type === 'passive';
            const cost = isPassive
              ? (en ? `Passive · ${skillMana(item.tier, true, item.id === 10)} mana` : `Пассивный · ${skillMana(item.tier, true, item.id === 10)} маны`)
              : (en ? `Active · ${skillMana(item.tier, false)} mana · ${skillCooldown(item.tier)} s cooldown` : `Активный · ${skillMana(item.tier, false)} маны · откат ${skillCooldown(item.tier)}с`);
            return <button type="button" onClick={() => openSkill(item.id)} className="mediaRow skillRow" key={item.id}>
              <span className="skillTile"><GameArt path={skillArt(item.id)} size={38}/><b aria-hidden="true">{item.tier}</b></span>
              <span><strong>{item.name}</strong><small>{cost}</small><small>{unlockCondition(item, en)}</small></span>
              <span className="rowChevron" aria-hidden="true"/>
            </button>;
          })}
        </section>
        <section className="card">
          <h2>{en ? 'What to know before battle' : 'Что важно знать перед боем'}</h2>
          <ul className="compactList combatTipsList">
            <li><strong>{en ? 'Mana is finite for the whole fight' : 'Мана конечна на весь бой'}</strong><span>{en
              ? 'Mana does not regenerate during combat. At 0 mana, both active skills and passives (Power Punch, Nutshell Aegis, Iron Will, Spirit Guidance) stop triggering.'
              : 'В бою она не восстанавливается. При 0 маны отключаются не только активные, но и пассивные навыки (Power Punch, Nutshell Aegis, Iron Will, Spirit Guidance).'}</span></li>
            <li><strong>{en ? '3-hit streak combo' : 'Серия из 3 попаданий подряд'}</strong><span>{en
              ? 'Three consecutive landed basic hits without block or dodge trigger a 4-hit flurry combo and stun the target for 1.5 s. A miss resets the counter.'
              : 'Три удара без блока и уклонения вызывают комбо из 4 доп. атак и оглушают цель на 1,5с. Промах сбрасывает счётчик.'}</span></li>
            <li><strong>{en ? '35% max HP cap per hit' : 'Максимум 35% HP за один удар'}</strong><span>{en
              ? 'Even a ×2 crit or ×5 Double Down cannot remove more than 35% of the target’s max health with a single basic hit.'
              : 'Даже крит ×2 или «Double Down» ×5 не снимут обычным ударом больше 35% максимального здоровья цели.'}</span></li>
            <li><strong>{en ? 'Stun does not lock blocking' : 'Оглушение не мешает блоку'}</strong><span>{en
              ? 'A stunned owl cannot attack, but can still switch guard zones. Only Crippling Chains lock the guard zone.'
              : 'Оглушённая сова не бьёт, но всё ещё меняет зону блока. Зафиксировать блок могут только «Crippling Chains».'}</span></li>
            <li><strong>{en ? 'What pierces defense' : 'Что бьёт сквозь защиту'}</strong><span>{en
              ? 'All 5 direct attack spells (Lightning, Asteroid, Fireball, Snowball, Desperate Throw) pierce both block and dodge (Evada Kedabra and Agility dodge); only Phase Shift blocks them and Nutshell Aegis reduces their damage. A hit into your block does not spend Evada Kedabra charges.'
              : 'Все 5 ударных заклинаний (Lightning, Asteroid, Fireball, Snowball, Desperate Throw) бьют и сквозь блок, и сквозь уклонение (Evada Kedabra и шанс от ловкости); полностью блокирует их только Phase Shift, а «Nutshell Aegis» снижает урон. Удар в твой блок не тратит заряды «Уклонения».'}</span></li>
            <li><strong>{en ? 'A brief pause after powerful spells' : 'Пауза после мощных заклинаний'}</strong><span>{en
              ? 'Snowball, Fireball, and Asteroid pause your attacks and guard switches for a few seconds. Check the opponent’s Phase Shift before casting.'
              : 'После применения Snowball, Fireball и Asteroid атаки и смена блока ненадолго приостанавливаются. Перед применением проверь, не действует ли Phase Shift у соперника.'}</span></li>
            <li><strong>{en ? '70% cap for crit and dodge' : 'Потолок 70% для крита и уклонения'}</strong><span>{en
              ? 'Both caps are reached at 100 stat points. Agility above 100 adds nothing, while Wisdom continues adding +20 mana per point.'
              : 'Оба предела достигаются при 100 стата. Ловкость сверх 100 ничего не даёт, а Мудрость продолжает добавлять +20 маны за очко.'}</span></li>
          </ul>
        </section>
      </>}
  </>;
}

export function ModesPage() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const format = en ? formatEn : formatRu;
  const lang = en ? 1 : 0;
  const { hash } = useLocation();
  return <section className="card modesCard">
        {modes.map(({ icon, title, subtitle, ...content }) => <details className="mediaDetails" key={icon}
          id={icon === 'rocket' ? 'flight' : undefined} open={icon === 'rocket' && hash === '#flight' || undefined}>
          <summary>{icon === 'swords' ? <GameArt path="/game/ui/fight-vs.png" size={36}/> : <GameSymbol name={icon}/>}
            <span><strong>{title[lang]}</strong><small>{subtitle[lang]}
              {icon === 'rocket' && <span className="energyBadge"> · {en ? 'from 250' : 'от 250'} <GameSymbol name="bolt" size={13}/></span>}
            </small></span>
          </summary>
          {icon === 'rocket' ? <FlightDetails/> : 'guide' in content && <div className="flightDetails">
            <p>{content.guide[lang]}</p>
            {icon === 'target' && <>
              <h4>{en ? 'Energy per raid' : 'Энергия за нападение'}</h4>
              <div className="flightEnergyGrid">
                {[[en ? 'Levels 1–4' : 'Уровни 1–4', 10], [en ? 'Levels 5–9' : 'Уровни 5–9', 20],
                  [en ? 'Levels 10–14' : 'Уровни 10–14', 30], [en ? 'Every +5 levels' : 'Каждые +5 ур.', '+10']].map(([label, cost]) =>
                  <div key={label}><span>{label}</span><strong>{cost} <GameSymbol name="bolt" size={15}/></strong></div>)}
              </div>
            </>}
            <ul className="compactList flightRules modeRules">
              {content.rules.map(row => <li key={row[0]}><span>{row[lang]}</span><strong>{row[lang + 2]}</strong></li>)}
            </ul>
            {icon === 'shield' && <DetailLink className="textLink" to="/squads">{en ? 'Siege map and rewards' : 'Карта и награды осад'}</DetailLink>}
            {icon === 'swords' && <DetailLink className="textLink" to="/combat">{en ? 'Combat skills' : 'Боевые навыки'}</DetailLink>}
          </div>}
        </details>)}
        <details className="mediaDetails"><summary><GameSymbol name="trophy"/><span><strong>{en ? 'Season prizes' : 'Призы сезона'}</strong><small>{en ? 'Top 100 places' : 'Первые 100 мест'}</small></span></summary>
        <ul className="compactList flightRules modeRules">
          <li><span>{en ? 'Places 1–10' : 'Места 1–10'}</span><strong>{en ? 'Golden Mystery Egg' : 'Золотое загадочное яйцо'}</strong></li>
          <li><span>{en ? 'Places 11–100' : 'Места 11–100'}</span><strong>{en ? 'Mystery Egg · sell for 100 Stars' : 'Загадочное яйцо · продажа за 100 Stars'}</strong></li>
        </ul>
        <h4>{en ? 'Example: prize pool of 1M $NOT' : 'Пример для фонда в 1 млн $NOT'}</h4>
        <table className="priceTable">
          <thead><tr><th scope="col">{en ? 'Place' : 'Место'}</th><th scope="col">{en ? 'Prize' : 'Приз'}</th></tr></thead>
          <tbody>{[400000, 350000, 250000].map((amount, index) =>
            <tr key={amount}><th scope="row">{index + 1}</th><td>{format.format(amount)} $NOT</td></tr>)}</tbody>
        </table>
        <p>{en ? 'Prizes are delivered automatically. The prize pool can vary by season.' : 'Призы начисляются автоматически. Размер фонда зависит от сезона.'}</p>
        <DetailLink className="textLink" to="/owl/season">{en ? 'What drops from the mystery egg' : 'Что выпадает из загадочного яйца'}</DetailLink>
      </details>
      <details className="mediaDetails" id="leagues" open={hash === "#leagues" || undefined}><summary><GameSymbol name="shield"/><span><strong>{en ? 'Battle leagues' : 'Боевые лиги'}</strong><small>{en ? 'Rating thresholds and farming bonus' : 'Пороги рейтинга и бонус к фарму'}</small></span></summary>
        <table className="priceTable">
          <thead><tr><th scope="col">{en ? 'League' : 'Лига'}</th><th scope="col">{en ? 'Min MMR' : 'От MMR'}</th><th scope="col">{en ? 'Farm' : 'Фарм'}</th></tr></thead>
          <tbody>{battleLeagues.map(([name, rating], index) => <tr key={name}>
            <th scope="row">{name}</th><td>{format.format(rating)}</td><td>+{index + 1}%</td>
          </tr>)}</tbody>
        </table>
      </details>
    </section>;
}

function SkillDetail({ skill }: { skill: Skill }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const format = en ? formatEn : formatRu;
  const precise = en ? preciseEn : preciseRu;
  const [level, setLevel] = useState(1);
  const [owlLevel, setOwlLevel] = useState(20);
  const [, descriptionRu] = skillCopy[skill.id - 1];
  const title = skill.name;
  const levelData = skillLevels[String(skill.id) as keyof typeof skillLevels];
  const echoDur = format.format(levelData.dur[level - 1]);
  const echoVal = String(Math.trunc(levelData.value[level - 1]));
  const description = skill.id === 14
    ? (en
        ? skill.effect.replace('{t}', echoDur).replace('{v}', echoVal)
        : `На ${echoDur}с каждый твой удар отдаётся эхом и бьёт ещё раз на ${echoVal}% своего урона.`)
    : (en ? skillDescriptionsEn[skill.id - 1] : descriptionRu);
  const type = levelData.type;
  const scalesWithLevel = hpEffects.has(type);
  const multiplier = skillHpMultiplier(owlLevel);
  return <section className="card">
    <div className="mediaHeading"><GameArt path={skillArt(skill.id)} size={64}/><div>
      <h2>{title}</h2><p>{en ? `tier ${skill.tier}` : `ступень ${skill.tier}`}</p>
    </div></div>
    {skill.id === 14 && <p className="caption">«{en ? skill.description : 'Дежавю, но больно'}»</p>}
    <p>{description}</p>
    <div className="skillUnlock"><strong>{en ? 'Unlock condition' : 'Условие открытия'}</strong><p>{unlockCondition(skill, en)}.</p></div>
    <label className="field">{en ? 'Skill level' : 'Уровень навыка'}
      <select value={level} onChange={event => setLevel(Number(event.target.value))}>
        {Array.from({ length: 21 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
    </label>
    {scalesWithLevel && <label className="field">{en ? 'Owl level' : 'Уровень совы'}
      <select value={owlLevel} onChange={event => setOwlLevel(Number(event.target.value))}>
        {progression.current.slice(1).map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
      </select>
    </label>}
    <ul className="compactList">
      {skillEffect(skill.id, level, owlLevel, en ? 1 : 0).map(([label, value]) => <li className="mediaRow" key={label}><span>{label}</span><strong>{value}</strong></li>)}
      <li className="mediaRow"><span>{skill.type === 'active' ? (en ? 'Mana per cast' : 'Мана за применение') : (en ? 'Mana per trigger' : 'Мана за срабатывание')}</span>
        <strong>{skillMana(skill.tier, skill.type === 'passive', type === 'reveal')}</strong></li>
      <li className="mediaRow"><span>{en ? 'Dojo training' : 'Тренировка в Додзе'}</span><strong className="energyBadge">{skill.dojoEnergy} <GameSymbol name="bolt" size={15}/></strong></li>
      {skill.type === 'active' && <li className="mediaRow"><span>{en ? 'Cooldown' : 'Перезарядка'}</span><strong>{skillCooldown(skill.tier)}{en ? ' s' : 'с'}</strong></li>}
      <li className="mediaRow"><span>{level === 21 ? (en ? 'Upgrade' : 'Прокачка') : (en ? `Upgrade to level ${level + 1}` : `Улучшение до ${level + 1}-го уровня`)}</span>
        <strong>{level === 21 ? (en ? 'Max' : 'Максимум') : <SpBadge value={format.format(100 * 2 ** (level - 1))}/>}</strong></li>
    </ul>
    {scalesWithLevel && <p className="caption">{en
      ? `Owl level multiplier ×${precise.format(multiplier)}. Shows base effect before target defense and other combat modifiers.`
      : `Множитель от уровня совы ×${precise.format(multiplier)}. Показан исходный эффект до защиты цели и других боевых модификаторов.`}</p>}
  </section>;
}

const attributesRu = [
  ['strength', 'Сила', '+0,065 урона за очко', 'Повышает урон обычных ударов.'],
  ['agility', 'Ловкость', '+0,7% к шансу уклонения за очко', 'Шанс складывается. Например, с 20% он вырастет до 20,7%. Предел — 70%.'],
  ['wisdom', 'Мудрость', '+0,7% к шансу крита и +20 маны за очко', 'Например, шанс крита 20% вырастет до 20,7%. Предел — 70%. Базовая мана — 200.'],
  ['endurance', 'Выносливость', '+2 HP за очко', 'К базовым 20 HP прибавляются 3 HP за каждый уровень совы и 2 HP за каждое очко выносливости.'],
] as const;

const attributesEn = [
  ['strength', 'Strength', '+0.065 damage per point', 'Increases the damage of basic hits.'],
  ['agility', 'Agility', '+0.7% dodge chance per point', 'Stacks additively. For example, 20% grows to 20.7%. Cap is 70%.'],
  ['wisdom', 'Wisdom', '+0.7% crit chance and +20 mana per point', 'For example, 20% crit chance grows to 20.7%. Cap is 70%. Base mana is 200.'],
  ['endurance', 'Endurance', '+2 HP per point', 'Base 20 HP plus 3 HP per owl level and 2 HP per Endurance point.'],
] as const;

function CombatStats() {
  const { hash } = useLocation();
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const format = en ? formatEn : formatRu;
  const attributes = en ? attributesEn : attributesRu;
  const [level, setLevel] = useState(0);
  const [owlLevel, setOwlLevel] = useState(2);
  const curve = progression.current;
  return <>
    <section className="card"><h2>{en ? 'Effect of one attribute point' : 'Эффект одного очка атрибута'}</h2>
      {attributes.map(([icon, name, effect, detail]) => <div className="mediaRow combatAttributeRow" key={icon}>
        <GameAttribute name={icon}/>
        <div><strong>{name}</strong><p>{effect}</p><p>{detail}</p></div>
      </div>)}
    </section>
    <section className="card"><h2>{en ? 'Owl upgrades' : 'Улучшения совы'}</h2>
      <p>{en
        ? <>Owl upgrades are permanent bonuses purchased with <SpBadge/> (skill points). Each upgrade has its own level.</>
        : <>Улучшения совы — постоянные бонусы за <SpBadge/> (очки навыков). У каждого улучшения свой уровень.</>}</p>
      <ul className="compactList owlUpgrades">
        <li><GameSymbol name="bolt" size={24}/><span>{en ? 'Max energy' : 'Запас энергии'}</span><b>+100 <GameSymbol name="bolt" size={13}/> {en ? 'per lvl' : 'за ур.'}</b></li>
        <li><GameSymbol name="rocket" size={24}/><span>{en ? 'Energy regeneration' : 'Восстановление энергии'}</span><b>{en ? '+3% per level' : '+3% за уровень'}</b></li>
        <li><GameSymbol name="heart" size={24}/><span>{en ? 'Health regeneration' : 'Восстановление здоровья'}</span><b>{en ? '+3% per level' : '+3% за уровень'}</b></li>
      </ul>
      <details><summary>{en ? 'Upgrade cost' : 'Цена улучшений'}</summary>
        <p className="caption">{en
          ? <>Each upgrade can be leveled up to 21. The first step costs 10 <SpBadge/>, and each next step costs twice as much.</>
          : <>Каждое улучшение можно прокачать до 21-го уровня. Первый шаг стоит 10 <SpBadge/>, каждый следующий вдвое дороже.</>}</p>
        <label className="field">{en ? 'Current upgrade level' : 'Текущий уровень улучшения'}
          <select value={level} onChange={event => setLevel(Number(event.target.value))}>
            {Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i} → {i + 1} {en ? 'lvl' : 'ур.'}</option>)}
          </select>
        </label>
        <p>{en ? 'Upgrade cost:' : 'Стоимость улучшения:'} <strong><SpBadge value={format.format(10 * 2 ** level)}/></strong></p>
      </details>
      <details id="xp" open={hash === '#xp' || undefined}><summary>{en ? 'XP for owl level' : 'Опыт для уровня совы'}</summary>
        <label className="field">{en ? 'Target owl level' : 'Целевой уровень совы'}
          <select value={owlLevel} onChange={event => setOwlLevel(Number(event.target.value))}>
            {curve.slice(1).map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
          </select>
        </label>
        <p>{en
          ? <>Total: <strong>{format.format(curve[owlLevel])} XP</strong> ({format.format(curve[owlLevel] - curve[owlLevel - 1])} XP from the previous level).</>
          : <>Всего: <strong>{format.format(curve[owlLevel])} XP</strong> (из них {format.format(curve[owlLevel] - curve[owlLevel - 1])} XP с предыдущего уровня).</>}</p>
      </details>
    </section>
  </>;
}

function FlightDetails() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  return <div className="flightDetails">
    <h4>{en ? 'Starting energy cost' : 'Расход энергии на старт'}</h4>
    <div className="flightEnergyGrid">
      <div><span>{en ? 'Levels 5–9' : 'Уровни 5–9'}</span><strong>250 <GameSymbol name="bolt" size={15}/></strong></div>
      <div><span>{en ? 'Levels 10–14' : 'Уровни 10–14'}</span><strong>300 <GameSymbol name="bolt" size={15}/></strong></div>
      <div><span>{en ? 'Levels 15–19' : 'Уровни 15–19'}</span><strong>350 <GameSymbol name="bolt" size={15}/></strong></div>
      <div><span>{en ? 'Every +5 lvls' : 'Каждые +5 ур.'}</span><strong>+50 <GameSymbol name="bolt" size={15}/></strong></div>
    </div>

    <h4>{en ? 'Helpful items in flight' : 'Что помогает в полёте'}</h4>
    <ul className="compactList flightItemsList">
      <li>
        <span className="flightItemHead"><GameSymbol name="rocket" size={20}/><strong>{en ? 'Rocket' : 'Ракета'}</strong></span>
        <p>{en ? 'Speeds you up, protects from obstacles, and multiplies coins. Three rockets per day, plus more can be found on the track.' : 'Ускоряет, защищает от препятствий и умножает монеты. Три ракеты в день, ещё можно найти на трассе.'}</p>
      </li>
      <li>
        <span className="flightItemHead"><GameSymbol name="magnet" size={20}/><strong>{en ? 'Magnet (10 s)' : 'Магнит (10 сек)'}</strong></span>
        <p>{en ? 'Pulls in coins from all three lanes.' : 'Притягивает монеты со всех трёх дорожек.'}</p>
      </li>
      <li>
        <span className="flightItemHead"><span className="emojiIcon">🍣</span><strong>{en ? 'Sushi' : 'Суши'}</strong></span>
        <p>{en
          ? <>The first two sushi each subtract <strong>20% of your current score</strong>. The third adds <strong>20%</strong> to your remaining coins and unlocks the <strong>Sushi Master</strong> sticker.</>
          : <>Первые две суши отнимают по <strong>20% текущего счёта</strong>. Третья прибавляет <strong>20%</strong> к оставшимся монетам и открывает стикер <strong>Sushi Master</strong>.</>}</p>
      </li>
    </ul>

    <h4>{en ? 'Track hazards' : 'Ловушки на трассе'}</h4>
    <ul className="compactList flightItemsList flightDebuffs">
      <li>
        <span className="flightItemHead"><GameSymbol name="cocktail" size={20}/><strong>{en ? 'Cocktail · Reverse (10 s)' : 'Коктейль · Реверс (10 сек)'}</strong></span>
        <p>{en ? 'Inverts controls for 10 seconds (left and right swap places) and distorts audio (slowed track and echo).' : 'Инвертирует управление на 10 секунд (влево и вправо меняются местами) и искажает звук (замедление трека и эхо).'}</p>
      </li>
      <li>
        <span className="flightItemHead"><GameSymbol name="magnifier" size={20}/><strong>{en ? 'Magnifier · Camera zoom (10 s)' : 'Лупа · Зум камеры (10 сек)'}</strong></span>
        <p>{en ? 'Zooms the camera in 1.5× for 10 seconds, cutting your field of view so pines and obstacles appear right in front of you.' : 'Приближает камеру в 1.5× раза на 10 секунд, срезая обзор — сосны и препятствия появляются прямо перед носом.'}</p>
      </li>
    </ul>

    <h4>{en ? 'Core rules and finish rewards' : 'Основные правила и награды на финише'}</h4>
    <ul className="compactList flightRules">
      <li><span>{en ? 'Minimum happiness' : 'Минимум счастья'}</span><strong>{en ? '10 points' : '10 единиц'}</strong></li>
      <li><span>{en ? 'Flight rewards' : 'Награды за полёт'}</span><strong>{en ? 'Coins, XP, and capsule drops (with an open slot)' : 'Монеты, XP и дроп капсул (при свободном слоте)'}</strong></li>
      <li><span>{en ? 'Paid offer at finish' : 'Платное предложение на финише'}</span><strong>{en ? 'May appear for Stars or GRAM' : 'Может появиться за Stars или GRAM'}</strong></li>
      <li><span>{en ? 'Farming bonus' : 'Бонус фарма'}</span><strong>{en ? 'Extra coins from equipment and league' : 'Дополнительные монеты от экипировки и лиги'}</strong></li>
    </ul>
  </div>;
}
