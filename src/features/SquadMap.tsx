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
  { id: 'all', label: 'Все (20)' },
  { id: 'coins', label: 'Монеты (8)' },
  { id: 'squad_silver', label: 'Серебро (7)' },
  { id: 'stats', label: 'Баффы (5)' },
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
      <h2><GameGlyph name="fight"/>Карта земель леса</h2>
      <p className="squadMapSub">Нажимай прямо на треугольники на карте — покажем награду и соседние земли (пунктир).</p>
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
          <small>{isEntry ? 'С краю карты — открыта при 0 земель' : 'Внутри леса — нужна смежная земля'}</small>
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
          <strong>Награды всех 20 земель за 1 раунд</strong>
          <small>4 000 монет · 700 серебра · +3 Мдр · +2 Лов · +2 Сил · +1 Вын</small>
        </span>
      </summary>
      <SiegeTotals totals={siegeRewardTotals}/>
      <p className="siegePoolNote">
        За 3 раунда монеты и серебро суммируются по итогам каждого 8-часового раунда (участнику нужен вклад от 1 мощи в раунде). Баффы к статам действуют 24 часа после нажатия «Забрать».
      </p>
    </details>
  </section>;
}
