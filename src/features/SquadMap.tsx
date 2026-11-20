import { useMemo, useState } from 'react';
import territories from './squad-map.json';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { Price } from './Price';
import { siegeRewardLabels, siegeRewardTotals, territoryRewards } from './siege-rewards';

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
  return <dl className="siegeRewardsGrid">
    {(Object.keys(siegeRewardLabels) as RewardKind[]).map(kind => <div key={kind}>
      <dt>{siegeRewardLabels[kind]}</dt>
      <dd><SiegeRewardValue kind={kind} amount={totals[kind] ?? 0}/></dd>
    </div>)}
  </dl>;
}

const mapFilterOptions: { id: MapFilter; label: string }[] = [
  { id: 'all', label: `Все (${counts.total})` },
  { id: 'coins', label: `Монеты (${counts.coins})` },
  { id: 'squad_silver', label: `Серебро (${counts.silver})` },
  { id: 'stats', label: `Баффы (${counts.stats})` },
];

const nf = new Intl.NumberFormat('ru-RU');

export function SquadMap() {
  const [selected, setSelected] = useState(territories[0].id);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [roundsHeld, setRoundsHeld] = useState<1 | 2 | 3>(3);

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

  return <section className="card squadMapCard" id="siege-map">
    <div className="squadMapHeader">
      <h2><GameGlyph name="fight"/>Карта 20 земель</h2>
      <p className="squadMapSub">Нажимай на треугольники на карте — покажем награду и смежные земли для атаки (пунктир).</p>
    </div>

    <div className="squadMapFilters" role="group" aria-label="Фильтр наград на карте">
      {mapFilterOptions.map(option => <button
        key={option.id}
        type="button"
        aria-pressed={filter === option.id}
        onClick={() => setFilter(option.id)}
      >{option.label}</button>)}
    </div>

    <div className="squadMapStage">
      <svg className="squadMap" viewBox="0 0 184 208" aria-label="Карта из 20 территорий осады">
        {territories.map(item => {
          const itemReward = territoryRewards[item.id];
          const isSelected = selected === item.id;
          const isNeighbor = neighborSet.has(item.id);
          const isDimmed = !isSelected && !matchesFilter(itemReward?.[0], filter);
          const ruName = territoryLabelsRu[item.id] ?? item.label;
          return <g
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={ruName}
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
        <span><i className="legendDot isSelected"/>Выбрана</span>
        <span><i className="legendDot isNeighbor"/>Соседи ({neighbors.length})</span>
        <span><i className="legendDot isCoins"/>Монеты</span>
        <span><i className="legendDot isSilver"/>Серебро</span>
        <span><i className="legendDot isStats"/>Бафф</span>
      </div>
    </div>

    <div className="squadMapInspector" aria-live="polite">
      <div className="squadMapInspectorHead">
        <div className="squadInspectorCopy">
          <strong>{territoryLabelsRu[territory.id] ?? territory.label}</strong>
          <small>{isEntry ? 'С краю карты — открыта для первого захвата с 0 земель' : 'Внутри леса — атака только от смежной своей земли'}</small>
        </div>
        {reward && <div className="squadMapRewardPill">
          <span>{reward[0] === 'coins' || reward[0] === 'squad_silver' ? siegeRewardLabels[reward[0]] : `${siegeRewardLabels[reward[0]]} · 24 ч`}</span>
          <strong><SiegeRewardValue kind={reward[0]} amount={reward[1]}/></strong>
        </div>}
      </div>
    </div>

    <details className="mediaDetails siegePayoutExample">
      <summary>
        <span>
          <strong>Награды всех земель: за раунд и за всю осаду</strong>
          <small>1 раунд ({counts.total}): {nf.format(coinsTotal)} монет · {nf.format(silverTotal)} серебра · 3 раунда ({counts.total * 3}): до {nf.format(coinsTotal * 3)} монет · {nf.format(silverTotal * 3)} серебра</small>
        </span>
      </summary>
      <div className="siegeRoundSwitch" role="group" aria-label="Суммарные награды по количеству раундов">
        {([1, 2, 3] as const).map(num => <button
          key={num}
          type="button"
          aria-pressed={roundsHeld === num}
          onClick={() => setRoundsHeld(num)}
        >
          {num === 1 ? `1 раунд (${counts.total})` : num === 2 ? `2 раунда (${counts.total * 2})` : `Вся осада · 3 раунда (${counts.total * 3})`}
        </button>)}
      </div>
      <SiegeTotals totals={scaledTotals}/>
      <p className="siegePoolNote">
        На карте {counts.total} участков, но осада идёт 3 раунда по 8 часов: по итогам каждого раунда удержанные земли начисляют награды в общую копилку осады (монеты, серебро и суточные баффы суммируются). Если сквад удержал все {counts.total} земель в 2 раундах ({counts.total * 2} удержаний) — каждый атаковавший участник получит {nf.format(coinsTotal * 2)} монет, {nf.format(silverTotal * 2)} серебра и ×2 баффов (+6 Мдр, +4 Лов, +4 Сил, +2 Вын). За все 3 раунда ({counts.total * 3} удержаний) максимум составляет {nf.format(coinsTotal * 3)} монет, {nf.format(silverTotal * 3)} серебра и ×3 баффов на 24 часа.
      </p>
    </details>
  </section>;
}
