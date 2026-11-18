import { useState } from 'react';
import territories from './squad-map.json';

export function SquadMap() {
  const [selected, setSelected] = useState(territories[0].id);
  const territory = territories.find(item => item.id === selected) ?? territories[0];
  return <section className="card squadMapCard">
    <h2>Карта осады</h2>
    <svg className="squadMap" viewBox="0 0 184 208" aria-label="Карта из 20 территорий осады">
      {territories.map(item => <g key={item.id} role="button" tabIndex={0} aria-label={item.label}
        aria-pressed={selected === item.id} onClick={() => setSelected(item.id)} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setSelected(item.id);
          }
        }}>
        <polygon points={item.points.map(point => point.join(',')).join(' ')}/>
        <circle cx={item.center[0]} cy={item.center[1]} r={2.8}/>
      </g>)}
    </svg>
    <div className="squadMapLabel" aria-live="polite"><strong>{territory.label}</strong><small>Выбери участок на карте</small></div>
  </section>;
}
