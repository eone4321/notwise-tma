import { useState } from 'react';
import { battleLeagues } from './battle-leagues';
import { emptySkin, type SkinParts } from './skin-examples';
import { GameArt } from '../ui/GameArt';
import { GameGlyph } from '../ui/GameGlyph';

const defaultGear = { rings: '', artifact: false, league: 0 };

function enchantValue(raw: string, max: number) {
  const digits = raw.replace(/\D/g, '');
  return digits ? String(Math.min(max, Number(digits))) : '';
}

export function SkinFarmCalculator({ parts, onChange }: { parts: SkinParts; onChange: (parts: SkinParts) => void }) {
  const [enchant, setEnchant] = useState('');
  const [gear, setGear] = useState(defaultGear);
  const skinBonus = Object.values(parts).reduce((total, value) => total + value, 0) + 5 * Number(enchant);
  const gearBonus = 5 * Number(gear.rings) + (gear.artifact ? 10 : 0);
  const total = skinBonus + gearBonus + gear.league;
  const extras = gearBonus + gear.league;

  function reset() {
    onChange(emptySkin);
    setEnchant('');
    setGear(defaultGear);
  }

  return <div className="calculator farmCalculator">
    <div className="farmCalcHeader">
      <h2 id="farm-title">Бонус к монетам</h2><button type="button" className="textLink" onClick={reset}>Сбросить</button>
    </div>
    <div className="farmTotal" role="status">
      <GameArt path="/game/items/wise-coin.webp" size={30}/>
      <span>В боях и полётах<small>Скин +{skinBonus}%{gearBonus > 0 && ` · экипировка +${gearBonus}%`}{gear.league > 0 && ` · лига +${gear.league}%`}</small></span>
      <strong>+{total}%</strong>
    </div>
    <div className="calculatorGrid">
      <label className="field">Оперение
        <select value={parts.body} onChange={event => onChange({ ...parts, body: Number(event.target.value) })}>
          <option value={0}>Нет</option><option value={5}>Обычное +5%</option><option value={15}>Золотое +15%</option>
        </select>
      </label>
      <label className="field">Украшение на груди
        <select value={parts.chest} onChange={event => onChange({ ...parts, chest: Number(event.target.value) })}>
          <option value={0}>Нет</option><option value={5}>Обычное +5%</option><option value={10}>Цепь NOT +10%</option>
        </select>
      </label>
    </div>
    <div className="compactFarmParts" role="group" aria-label="Аксессуары скина">
      {([['hat', 'Убор'], ['glasses', 'Очки'], ['eyes', 'Глаза']] as const).map(([key, label]) =>
        <button key={key} type="button" aria-pressed={parts[key] > 0} onClick={() => onChange({ ...parts, [key]: parts[key] ? 0 : 5 })}>{label} <small>+5%</small></button>)}
    </div>
    <label className="farmEnchant">
      <GameArt path="/game/items/scroll-enchant-skin.webp" size={30}/>
      <span>Заточка скина<small>+5% за уровень</small></span>
      <input value={enchant} placeholder="0" inputMode="numeric" maxLength={2}
        onChange={event => setEnchant(enchantValue(event.target.value, 20))}/>
    </label>
    <details className="mediaDetails farmExtras" id="farm-equipment">
      <summary><GameGlyph name="shield"/><strong>Кольца, артефакт и лига</strong>
        {extras > 0 && <b className="farmExtrasValue">+{extras}%</b>}
      </summary>
      <div className="calculatorGrid">
        <label className="field">Сумма заточек колец
          <input value={gear.rings} inputMode="numeric" maxLength={2} placeholder="0"
            onChange={event => setGear({ ...gear, rings: enchantValue(event.target.value, 60) })}/>
        </label>
        <label className="field">Боевая лига
          <select value={gear.league} onChange={event => setGear({ ...gear, league: Number(event.target.value) })}>
            <option value={0}>Без бонуса</option>
            {battleLeagues.map(([name], index) => <option key={name} value={index + 1}>{name} +{index + 1}%</option>)}
          </select>
        </label>
      </div>
      <label className="farmArtifact"><input type="checkbox" checked={gear.artifact}
        onChange={event => setGear({ ...gear, artifact: event.target.checked })}/> Монтмориллонит +10%</label>
    </details>
  </div>;
}
