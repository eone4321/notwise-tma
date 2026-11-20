import { useMemo, useState } from 'react';
import territories from './squad-map.json';
import { GameAttribute } from '../ui/GameGlyph';
import { Price } from './Price';
import { siegeRewardLabels, siegeRewardTotals, territoryRewards } from './siege-rewards';

type Territory = (typeof territories)[number];
type RewardKind = keyof typeof siegeRewardLabels;
type MapFilter = 'all' | 'coins' | 'squad_silver' | 'stats';

export const territoryLabelsRu: Record<string, string> = {
  'heart': 'Сердце леса',
  'north': 'Сосновый хребет',
  'north-east': 'Лунная роща',
  'south-east': 'Тлеющая поляна',
  'south': 'Мшистая лощина',
  'south-west': 'Старые корни',
  'north-west': 'Серебряная чаща',
  'high-pines': 'Высокие сосны',
  'mist-pass': 'Туманный перевал',
  'dawn-wood': 'Рассветный лес',
  'amber-grove': 'Янтарная роща',
  'fox-hollow': 'Лисья нора',
  'sun-glade': 'Солнечная поляна',
  'fern-valley': 'Долина папоротников',
  'deep-wood': 'Дремучий бор',
  'stone-roots': 'Каменные корни',
  'raven-wood': 'Вороний лес',
  'silent-grove': 'Тихая роща',
  'frost-ridge': 'Морозный хребет',
  'watch-pines': 'Дозорные сосны',
};

const { byId, neighborsMap, entryIds } = (() => {
  const mapById = new Map<string, Territory>();
  const edgeOwners = new Map<string, string[]>();
  const adj: Record<string, string[]> = {};

  for (const item of territories) {
    mapById.set(item.id, item);
    adj[item.id] = [];
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
  return { byId: mapById, neighborsMap: adj, entryIds: entry };
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
  { id: 'all', label: '🗺️ Все' },
  { id: 'coins', label: '🪙 Монеты' },
  { id: 'squad_silver', label: '🥈 Серебро' },
  { id: 'stats', label: '⚡ Статы' },
];

export function SquadMap() {
  const [selected, setSelected] = useState(territories[0].id);
  const [filter, setFilter] = useState<MapFilter>('all');

  const territory = byId.get(selected) ?? territories[0];
  const reward = territoryRewards[territory.id];
  const neighbors = useMemo(() => neighborsMap[territory.id] ?? [], [territory.id]);
  const neighborSet = useMemo(() => new Set(neighbors), [neighbors]);
  const isEntry = entryIds.has(territory.id);

  return <section className="card squadMapCard" id="siege-map">
    <div className="squadMapHeader">
      <h2>🗺️ Карта земель (20)</h2>
      <p className="squadMapSub">Нажми на участок — покажем награду и соседние земли.</p>
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
        <span><i className="legendDot isNeighbor"/>Рядом ({neighbors.length})</span>
        <span><i className="legendDot isCoins"/>Монеты</span>
        <span><i className="legendDot isSilver"/>Серебро</span>
        <span><i className="legendDot isStats"/>Бафф</span>
      </div>
    </div>

    <div className="squadMapInspector" aria-live="polite">
      <div className="squadMapInspectorHead">
        <div>
          <strong>{territoryLabelsRu[territory.id] ?? territory.label}</strong>
          <small>{isEntry ? 'С краю карты — можно зайти с 0 земель' : 'Внутри — атака от своих соседних земель'}</small>
        </div>
        {reward && <div className="squadMapRewardPill">
          <span>{siegeRewardLabels[reward[0]]}</span>
          <strong><SiegeRewardValue kind={reward[0]} amount={reward[1]}/></strong>
        </div>}
      </div>

      <div className="squadNeighborsBar">
        <span className="squadNeighborsLabel">Рядом на карте:</span>
        <div className="squadNeighborChips">
          {neighbors.map(neighborId => <button
            key={neighborId}
            type="button"
            className="squadNeighborChip"
            onClick={() => setSelected(neighborId)}
          >
            {territoryLabelsRu[neighborId] ?? byId.get(neighborId)?.label ?? neighborId}
          </button>)}
        </div>
      </div>
    </div>

    <details className="mediaDetails siegePayoutExample">
      <summary>
        <span>
          <strong>🪙 Пул всех 20 земель за раунд</strong>
          <small>4 000 монет · 700 серебра · +8 к статам</small>
        </span>
      </summary>
      <SiegeTotals totals={siegeRewardTotals}/>
    </details>
  </section>;
}
