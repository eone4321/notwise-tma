import { useState } from 'react';
import { battleLeagues } from './battle-leagues';
import { GameArt } from '../ui/GameArt';

const initial = {
  hat: false, glasses: false, eyes: false, body: 5, chest: 0,
  skinEnchant: '0', ringEnchant: '0', montmorillonite: false, league: 0,
};

export function SkinFarmCalculator({ showTitle = false }: { showTitle?: boolean }) {
  const [state, setState] = useState(initial);
  const skinBonus = state.body + state.chest + [state.hat, state.glasses, state.eyes].filter(Boolean).length * 5 + 5 * Number(state.skinEnchant);
  const gearBonus = 5 * Number(state.ringEnchant) + (state.montmorillonite ? 10 : 0);
  const total = skinBonus + gearBonus + state.league;
  return <div className="compactFarm">
    <div className="farmTotal" aria-live="polite">
      <GameArt path="/game/items/wise-coin.webp" size={30}/>
      <span>{showTitle ? 'Калькулятор фарма' : 'Фарм монет'}<small>Скин +{skinBonus}% · предметы +{gearBonus}% · лига +{state.league}%</small></span>
      <strong>+{total}%</strong>
    </div>
    <div className="compactFarmGrid">
      <label className="field">Оперение
        <select value={state.body} onChange={event => setState({ ...state, body: Number(event.target.value) })}>
          <option value={0}>Нет</option><option value={5}>Обычное +5%</option><option value={15}>Золотое +15%</option>
        </select>
      </label>
      <label className="field">Украшение на груди
        <select value={state.chest} onChange={event => setState({ ...state, chest: Number(event.target.value) })}>
          <option value={0}>Нет</option><option value={5}>Обычное +5%</option><option value={10}>Цепь NOT +10%</option>
        </select>
      </label>
    </div>
    <div className="compactFarmParts" role="group" aria-label="Аксессуары по 5%">
      {([['hat', 'Убор'], ['glasses', 'Очки'], ['eyes', 'Глаза']] as const).map(([key, label]) =>
        <button key={key} type="button" aria-pressed={state[key]} onClick={() => setState({ ...state, [key]: !state[key] })}>{label} <small>+5%</small></button>)}
    </div>
    <div className="compactFarmGrid">
      {([['skinEnchant', 'Заточка скина', 20], ['ringEnchant', 'Заточка колец суммарно', 60]] as const).map(([key, label, max]) =>
        <label className="field" key={key}>{label}<input value={state[key]} inputMode="numeric" maxLength={2} placeholder="0"
          onChange={event => {
            const digits = event.target.value.replace(/\D/g, '');
            setState({ ...state, [key]: digits ? String(Math.min(max, Number(digits))) : '' });
          }}/></label>)}
      <label className="field">Боевая лига
        <select value={state.league} onChange={event => setState({ ...state, league: Number(event.target.value) })}>
          <option value={0}>Без бонуса</option>
          {battleLeagues.map(([name], index) => <option key={name} value={index + 1}>{name} +{index + 1}%</option>)}
        </select>
      </label>
      <label className="farmArtifact"><input type="checkbox" checked={state.montmorillonite}
        onChange={event => setState({ ...state, montmorillonite: event.target.checked })}/> Монтмориллонит +10%</label>
    </div>
    <p className="caption farmApplies">Бонус добавляет монеты за победу в рейтинге и успешный полёт. Шансы на $NOT указаны в разделе капсул.</p>
    <div className="compactFarmFoot"><small>Каждый уровень заточки даёт +5%.</small>
      <button type="button" className="textLink" onClick={() => setState(initial)}>Сбросить</button></div>
  </div>;
}
