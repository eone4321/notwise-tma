import { useMemo, useState } from 'react';
import territories from './squad-map.json';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { Price } from './Price';
import { useGuideLocale } from './guideLocale';
import { getSiegeRewardLabel, siegeRewardLabels, siegeRewardTotals, territoryRewards } from './siege-rewards';

type Territory = (typeof territories)[number];
type RewardKind = keyof typeof siegeRewardLabels;
type MapFilter = 'all' | 'coins' | 'squad_silver' | 'stats';

export const territoryLabelsRu: Record<string, string> = {
  'heart': 'Сердце леса',
  'north': 'Сосновый хребет',
  'north-east': 'Лунная роща',
  'south-east': 'Угольная поляна',
  'south': 'Мшистая низина',
  'south-west': 'Старые корни',
  'north-west': 'Серебряная чаща',
  'high-pines': 'Высокие сосны',
  'mist-pass': 'Туманный перевал',
  'dawn-wood': 'Рассветный лес',
  'amber-grove': 'Янтарная роща',
  'fox-hollow': 'Лисья низина',
  'sun-glade': 'Солнечная поляна',
  'fern-valley': 'Папоротниковая долина',
  'deep-wood': 'Глухолесье',
  'stone-roots': 'Каменные корни',
  'raven-wood': 'Вороний лес',
  'silent-grove': 'Тихая роща',
  'frost-ridge': 'Морозный хребет',
  'watch-pines': 'Дозорные сосны',
};

const { byId, neighborsMap, entryIds, counts } = (() => {
  const mapById = new Map<string, Territory>();
  const edgeOwners = new Map<string, string[]>();
  const adj: Record<string, string[]> = {};
  let coins = 0;
  let silver = 0;
  let stats = 0;

  for (const item of territories) {
    mapById.set(item.id, item);
    adj[item.id] = [];
    const rw = territoryRewards[item.id]?.[0];
    if (rw === 'coins') coins += 1;
    else if (rw === 'squad_silver') silver += 1;
    else if (rw) stats += 1;

    const pts = item.points.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`);
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const list = edgeOwners.get(key);
      if (list) list.push(item.id);
      else edgeOwners.set(key, [item.id]);
    }
  }

  for (const ids of edgeOwners.values()) {
    if (ids.length === 2) {
      adj[ids[0]].push(ids[1]);
      adj[ids[1]].push(ids[0]);
    }
  }

  const entry = new Set<string>(
    territories.filter(item => adj[item.id].length < 3).map(item => item.id),
  );
  return {
    byId: mapById,
    neighborsMap: adj,
    entryIds: entry,
    counts: { total: territories.length, coins, silver, stats },
  };
})();

function matchesFilter(kind: RewardKind | undefined, filter: MapFilter): boolean {
  if (filter === 'all' || !kind) return true;
  if (filter === 'stats') return kind !== 'coins' && kind !== 'squad_silver';
  return kind === filter;
}

function rewardGroup(kind: RewardKind | undefined): 'coins' | 'silver' | 'stats' {
  if (kind === 'coins') return 'coins';
  if (kind === 'squad_silver') return 'silver';
  return 'stats';
}

export function SiegeRewardValue({ kind, amount }: { kind: RewardKind; amount: number }) {
  return kind === 'coins' || kind === 'squad_silver'
    ? <Price value={amount} currency={kind}/>
    : <>+{amount} <GameAttribute name={kind}/></>;
}

export function SiegeTotals({ totals = siegeRewardTotals }: { totals?: Partial<Record<RewardKind, number>> }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  return <dl className="siegeRewardsGrid">
    {(Object.keys(siegeRewardLabels) as RewardKind[]).map(kind => <div key={kind}>
      <dt>{getSiegeRewardLabel(kind, en)}</dt>
      <dd><SiegeRewardValue kind={kind} amount={totals[kind] ?? 0}/></dd>
    </div>)}
  </dl>;
}

const nfRu = new Intl.NumberFormat('ru-RU');
const nfEn = new Intl.NumberFormat('en-US');

export function SquadMap() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const nf = en ? nfEn : nfRu;
  const [selected, setSelected] = useState(territories[0].id);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [roundsHeld, setRoundsHeld] = useState<1 | 2 | 3>(3);

  const mapFilterOptions: { id: MapFilter; label: string }[] = [
    { id: 'all', label: en ? `All (${counts.total})` : `Все (${counts.total})` },
    { id: 'coins', label: en ? `Coins (${counts.coins})` : `Монеты (${counts.coins})` },
    { id: 'squad_silver', label: en ? `Silver (${counts.silver})` : `Серебро (${counts.silver})` },
    { id: 'stats', label: en ? `Buffs (${counts.stats})` : `Баффы (${counts.stats})` },
  ];

  const territory = byId.get(selected) ?? territories[0];
  const reward = territoryRewards[territory.id];
  const neighbors = useMemo(() => neighborsMap[territory.id] ?? [], [territory.id]);
  const neighborSet = useMemo(() => new Set(neighbors), [neighbors]);
  const isEntry = entryIds.has(territory.id);

  const coinsTotal = siegeRewardTotals.coins ?? 0;
  const silverTotal = siegeRewardTotals.squad_silver ?? 0;
  const scaledTotals = useMemo(() => {
    const next: Partial<Record<RewardKind, number>> = {};
    for (const kind of Object.keys(siegeRewardLabels) as RewardKind[]) {
      next[kind] = (siegeRewardTotals[kind] ?? 0) * roundsHeld;
    }
    return next;
  }, [roundsHeld]);

  const territoryName = (item: Territory) => en ? item.label : (territoryLabelsRu[item.id] ?? item.label);

  return <section className="card squadMapCard" id="siege-map">
    <div className="squadMapHeader">
      <h2><GameGlyph name="fight"/>{en ? 'Map of 20 Territories' : 'Карта 20 земель'}</h2>
      <p className="squadMapSub">{en ? 'Tap triangles on the map to inspect their reward and adjacent territories for attack (dashed outline).' : 'Нажимай на треугольники на карте — покажем награду и смежные земли для атаки (пунктир).'}</p>
    </div>

    <div className="squadMapFilters" role="group" aria-label={en ? 'Filter territory rewards on the map' : 'Фильтр наград на карте'}>
      {mapFilterOptions.map(option => <button
        key={option.id}
        type="button"
        aria-pressed={filter === option.id}
        onClick={() => setFilter(option.id)}
      >{option.label}</button>)}
    </div>

    <div className="squadMapStage">
      <svg className="squadMap" viewBox="0 0 184 208" aria-label={en ? 'Siege map of 20 territories' : 'Карта из 20 территорий осады'}>
        {territories.map(item => {
          const itemReward = territoryRewards[item.id];
          const isSelected = selected === item.id;
          const isNeighbor = neighborSet.has(item.id);
          const isDimmed = !isSelected && !matchesFilter(itemReward?.[0], filter);
          const name = territoryName(item);
          return <g
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={name}
            aria-pressed={isSelected}
            data-reward-group={rewardGroup(itemReward?.[0])}
            data-neighbor={isNeighbor ? 'true' : undefined}
            data-dim={isDimmed ? 'true' : undefined}
            onClick={() => setSelected(item.id)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelected(item.id);
              }
            }}
          >
            <polygon points={item.points.map(point => point.join(',')).join(' ')}/>
            <circle cx={item.center[0]} cy={item.center[1]} r={isSelected ? 3.5 : isNeighbor ? 3 : 2.5}/>
          </g>;
        })}
      </svg>

      <div className="squadMapLegend" aria-hidden="true">
        <span><i className="legendDot isSelected"/>{en ? 'Selected' : 'Выбрана'}</span>
        <span><i className="legendDot isNeighbor"/>{en ? `Neighbors (${neighbors.length})` : `Соседи (${neighbors.length})`}</span>
        <span><i className="legendDot isCoins"/>{en ? 'Coins' : 'Монеты'}</span>
        <span><i className="legendDot isSilver"/>{en ? 'Silver' : 'Серебро'}</span>
        <span><i className="legendDot isStats"/>{en ? 'Buff' : 'Бафф'}</span>
      </div>
    </div>

    <div className="squadMapInspector" aria-live="polite">
      <div className="squadMapInspectorHead">
        <div className="squadInspectorCopy">
          <strong>{territoryName(territory)}</strong>
          <small>{isEntry
            ? (en ? 'Map edge — open for initial capture when holding 0 territories' : 'С краю карты — открыта для первого захвата с 0 земель')
            : (en ? 'Inner forest — can only be attacked from an adjacent territory you hold' : 'Внутри леса — атака только от смежной своей земли')}</small>
        </div>
        {reward && <div className="squadMapRewardPill">
          <span>{reward[0] === 'coins' || reward[0] === 'squad_silver'
            ? getSiegeRewardLabel(reward[0], en)
            : `${getSiegeRewardLabel(reward[0], en)} · ${en ? '24 h' : '24ч'}`}</span>
          <strong><SiegeRewardValue kind={reward[0]} amount={reward[1]}/></strong>
        </div>}
      </div>
    </div>

    <details className="mediaDetails siegePayoutExample">
      <summary>
        <span>
          <strong>{en ? 'All-territory rewards: per round and full siege' : 'Награды всех земель: за раунд и за всю осаду'}</strong>
          <small>{en
            ? `1 round (${counts.total}): ${nf.format(coinsTotal)} coins · ${nf.format(silverTotal)} silver · 3 rounds (${counts.total * 3}): up to ${nf.format(coinsTotal * 3)} coins · ${nf.format(silverTotal * 3)} silver`
            : `1 раунд (${counts.total}): ${nf.format(coinsTotal)} монет · ${nf.format(silverTotal)} серебра · 3 раунда (${counts.total * 3}): до ${nf.format(coinsTotal * 3)} монет · ${nf.format(silverTotal * 3)} серебра`}</small>
        </span>
      </summary>
      <div className="siegeRoundSwitch" role="group" aria-label={en ? 'Total rewards by number of rounds' : 'Суммарные награды по количеству раундов'}>
        {([1, 2, 3] as const).map(num => <button
          key={num}
          type="button"
          aria-pressed={roundsHeld === num}
          onClick={() => setRoundsHeld(num)}
        >
          {num === 1
            ? (en ? `1 round (${counts.total})` : `1 раунд (${counts.total})`)
            : num === 2
              ? (en ? `2 rounds (${counts.total * 2})` : `2 раунда (${counts.total * 2})`)
              : (en ? `Full siege · 3 rounds (${counts.total * 3})` : `Вся осада · 3 раунда (${counts.total * 3})`)}
        </button>)}
      </div>
      <SiegeTotals totals={scaledTotals}/>
      <p className="siegePoolNote">
        {en
          ? `There are ${counts.total} territories on the map, and a siege runs for three 8-hour rounds: after each round, held territories add their rewards to the shared siege pool (coins, silver, and 24-hour buffs stack). If a squad holds all ${counts.total} territories across 2 rounds (${counts.total * 2} holds), every attacking participant receives ${nf.format(coinsTotal * 2)} coins, ${nf.format(silverTotal * 2)} silver, and ×2 buffs (+6 Wis, +4 Agi, +4 Str, +2 End). Across all 3 rounds (${counts.total * 3} holds), the maximum payout is ${nf.format(coinsTotal * 3)} coins, ${nf.format(silverTotal * 3)} silver, and ×3 buffs for 24 hours.`
          : `На карте ${counts.total} участков, но осада идёт 3 раунда по 8 часов: по итогам каждого раунда удержанные земли начисляют награды в общую копилку осады (монеты, серебро и суточные баффы суммируются). Если сквад удержал все ${counts.total} земель в 2 раундах (${counts.total * 2} удержаний) — каждый атаковавший участник получит ${nf.format(coinsTotal * 2)} монет, ${nf.format(silverTotal * 2)} серебра и ×2 баффов (+6 Мдр, +4 Лов, +4 Сил, +2 Вын). За все 3 раунда (${counts.total * 3} удержаний) максимум составляет ${nf.format(coinsTotal * 3)} монет, ${nf.format(silverTotal * 3)} серебра и ×3 баффов на 24 часа.`}
      </p>
    </details>
  </section>;
}
