import { useState, useId } from 'react';
import { battleLeagues } from './battle-leagues';

export interface SkinFarmState {
  hat: boolean;
  glasses: boolean;
  eyes: boolean;
  body: 'none' | 'regular' | 'gold';
  chest: 'none' | 'regular' | 'chain';
  skinEnchant: number;
  ringEnchant: number;
  montmorillonite: boolean;
  leagueIndex: number; // 0 = none, 1..13 = Arrival..Wisdom (+1%..+13%)
}

export function calculateFarmBonus(state: SkinFarmState) {
  let skinParts = 0;
  if (state.hat) skinParts += 5;
  if (state.glasses) skinParts += 5;
  if (state.eyes) skinParts += 5;
  if (state.body === 'regular') skinParts += 5;
  else if (state.body === 'gold') skinParts += 15;
  if (state.chest === 'regular') skinParts += 5;
  else if (state.chest === 'chain') skinParts += 10;

  const skinEnchantBonus = Math.max(0, Math.min(20, state.skinEnchant)) * 5;
  const ringEnchantBonus = Math.max(0, Math.min(60, state.ringEnchant)) * 5;
  const artifactBonus = state.montmorillonite ? 10 : 0;
  const leagueBonus = state.leagueIndex > 0 ? Math.min(13, state.leagueIndex) : 0;

  const skinTotal = skinParts + skinEnchantBonus;
  const totalBonus = skinTotal + ringEnchantBonus + artifactBonus + leagueBonus;

  return {
    skinParts,
    skinEnchantBonus,
    skinTotal,
    ringEnchantBonus,
    artifactBonus,
    leagueBonus,
    totalBonus,
  };
}

export function FarmInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="farmModalBackdrop" onClick={onClose} role="presentation">
      <div
        className="farmModalContent card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="farm-modal-title"
      >
        <div className="farmModalHeader">
          <div className="farmModalHeading">
            <span className="farmInfoBadge">i</span>
            <h3 id="farm-modal-title">Как работает бонус к фарму</h3>
          </div>
          <button
            type="button"
            className="farmModalClose"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="farmModalBody">
          <section className="farmModalSection">
            <h4>На что влияет показатель фарма?</h4>
            <ul className="farmModalList">
              <li>
                <strong>💎 Дроп Notcoin ($NOT) из капсул:</strong> базовая вероятность выпадения каждой пачки $NOT умножается на <code>(1 + Бонус / 100)</code>. Например, при бонусе +100% шанс удваивается.
              </li>
              <li>
                <strong>🪙 Бонусные монеты в боях и рейдах:</strong> за каждую победу сова получает дополнительные монеты (<code>farmCoins</code>), пропорциональные показателю фарма.
              </li>
              <li>
                <strong>🦉 Статус и фарм в профиле:</strong> процент фарма виден в профиле совы и учитывается в расчётах игрового баланса.
              </li>
            </ul>
          </section>

          <section className="farmModalSection">
            <h4>Из чего складывается бонус?</h4>
            <div className="farmModalGrid">
              <div className="farmModalTile">
                <strong>Детали скина</strong>
                <span>+5% за обычную деталь (убор, очки, глаза, тело, грудь). Золотое тело даёт сразу <strong>+15%</strong>, цепь NOT — <strong>+10%</strong>. Максимум деталей: <strong>+40%</strong>.</span>
              </div>
              <div className="farmModalTile">
                <strong>Заточка скина</strong>
                <span>Свитки заточки скина дают <strong>+5%</strong> за каждый уровень (+1..+20 = до <strong>+100%</strong>).</span>
              </div>
              <div className="farmModalTile">
                <strong>Заточка колец</strong>
                <span>Каждый уровень заточки каждого надетого кольца даёт <strong>+5%</strong> (до 3 колец по +20 = до <strong>+300%</strong>).</span>
              </div>
              <div className="farmModalTile">
                <strong>Артефакт</strong>
                <span>«Монтмориллонит» добавляет <strong>+10%</strong> к фарму и держит здоровье полным.</span>
              </div>
              <div className="farmModalTile">
                <strong>Лига в PvP</strong>
                <span>Лига по боевому MMR даёт <strong>от +1% до +13%</strong> ко всем расчётам фарма.</span>
              </div>
            </div>
          </section>
        </div>

        <button type="button" className="farmModalButton" onClick={onClose}>
          Понятно!
        </button>
      </div>
    </div>
  );
}

interface SkinFarmCalculatorProps {
  initialState?: Partial<SkinFarmState>;
  onChange?: (totalBonus: number, skinTotal: number) => void;
  showTitle?: boolean;
  showEffects?: boolean;
}

export function SkinFarmCalculator({
  initialState,
  onChange,
  showTitle = false,
  showEffects = false,
}: SkinFarmCalculatorProps) {
  const [state, setState] = useState<SkinFarmState>({
    hat: initialState?.hat ?? false,
    glasses: initialState?.glasses ?? false,
    eyes: initialState?.eyes ?? false,
    body: initialState?.body ?? 'regular',
    chest: initialState?.chest ?? 'none',
    skinEnchant: initialState?.skinEnchant ?? 0,
    ringEnchant: initialState?.ringEnchant ?? 0,
    montmorillonite: initialState?.montmorillonite ?? false,
    leagueIndex: initialState?.leagueIndex ?? 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const calc = calculateFarmBonus(state);

  const updateState = (updater: (prev: SkinFarmState) => SkinFarmState) => {
    setState(prev => {
      const next = updater(prev);
      const nextCalc = calculateFarmBonus(next);
      onChange?.(nextCalc.totalBonus, nextCalc.skinTotal);
      return next;
    });
  };

  const id = useId();

  return (
    <div className="skinFarmCalc">
      {showTitle && (
        <div className="calcHeader">
          <div className="calcTitle">
            <h3>Калькулятор бонуса к фарму</h3>
            <p className="caption">Отметь детали скина совы, заточку и экипировку</p>
          </div>
          <button
            type="button"
            className="infoCircleBtn"
            onClick={() => setIsModalOpen(true)}
            aria-label="Справка о бонусе к фарму"
            title="Как работает бонус к фарму"
          >
            i
          </button>
        </div>
      )}

      {/* 5 Body Slots */}
      <div className="slotsContainer">
        <div className="slotsHeader">
          <span>Детали по телу совы</span>
          <strong className="slotsBonusBadge">+{calc.skinParts}% к фарму</strong>
        </div>

        <div className="bodySlotsGrid">
          {/* 1. Голова */}
          <button
            type="button"
            className={`slotBox ${state.hat ? 'active' : ''}`}
            onClick={() => updateState(s => ({ ...s, hat: !s.hat }))}
            aria-pressed={state.hat}
          >
            <div className="slotBoxCheck">{state.hat ? '✓' : ''}</div>
            <div className="slotBoxInfo">
              <span className="slotBoxName">🎩 Головной убор</span>
              <small className="slotBoxSub">{state.hat ? 'Надет (+5%)' : 'Нет детали (0%)'}</small>
            </div>
            <strong className="slotBoxValue">+{state.hat ? 5 : 0}%</strong>
          </button>

          {/* 2. Очки / маска */}
          <button
            type="button"
            className={`slotBox ${state.glasses ? 'active' : ''}`}
            onClick={() => updateState(s => ({ ...s, glasses: !s.glasses }))}
            aria-pressed={state.glasses}
          >
            <div className="slotBoxCheck">{state.glasses ? '✓' : ''}</div>
            <div className="slotBoxInfo">
              <span className="slotBoxName">🕶️ Очки / маска</span>
              <small className="slotBoxSub">{state.glasses ? 'Надеты (+5%)' : 'Нет детали (0%)'}</small>
            </div>
            <strong className="slotBoxValue">+{state.glasses ? 5 : 0}%</strong>
          </button>

          {/* 3. Глаза */}
          <button
            type="button"
            className={`slotBox ${state.eyes ? 'active' : ''}`}
            onClick={() => updateState(s => ({ ...s, eyes: !s.eyes }))}
            aria-pressed={state.eyes}
          >
            <div className="slotBoxCheck">{state.eyes ? '✓' : ''}</div>
            <div className="slotBoxInfo">
              <span className="slotBoxName">👀 Особые глаза</span>
              <small className="slotBoxSub">{state.eyes ? 'Есть (+5%)' : 'Обычные (0%)'}</small>
            </div>
            <strong className="slotBoxValue">+{state.eyes ? 5 : 0}%</strong>
          </button>

          {/* 4. Тело / оперение */}
          <div className="slotChoiceBlock">
            <div className="slotChoiceLabel">
              <span>🦉 Оперение тела</span>
              <strong>+{state.body === 'gold' ? 15 : state.body === 'regular' ? 5 : 0}%</strong>
            </div>
            <div className="slotChoicePills" role="radiogroup" aria-label="Оперение тела">
              <button
                type="button"
                aria-pressed={state.body === 'none'}
                onClick={() => updateState(s => ({ ...s, body: 'none' }))}
              >
                Нет (0%)
              </button>
              <button
                type="button"
                aria-pressed={state.body === 'regular'}
                onClick={() => updateState(s => ({ ...s, body: 'regular' }))}
              >
                Обычное (+5%)
              </button>
              <button
                type="button"
                className="goldOption"
                aria-pressed={state.body === 'gold'}
                onClick={() => updateState(s => ({ ...s, body: 'gold' }))}
              >
                ⭐ Золотое (+15%)
              </button>
            </div>
          </div>

          {/* 5. Грудь / украшение */}
          <div className="slotChoiceBlock">
            <div className="slotChoiceLabel">
              <span>📿 Украшение на груди</span>
              <strong>+{state.chest === 'chain' ? 10 : state.chest === 'regular' ? 5 : 0}%</strong>
            </div>
            <div className="slotChoicePills" role="radiogroup" aria-label="Украшение груди">
              <button
                type="button"
                aria-pressed={state.chest === 'none'}
                onClick={() => updateState(s => ({ ...s, chest: 'none' }))}
              >
                Нет (0%)
              </button>
              <button
                type="button"
                aria-pressed={state.chest === 'regular'}
                onClick={() => updateState(s => ({ ...s, chest: 'regular' }))}
              >
                Обычное (+5%)
              </button>
              <button
                type="button"
                className="chainOption"
                aria-pressed={state.chest === 'chain'}
                onClick={() => updateState(s => ({ ...s, chest: 'chain' }))}
              >
                💎 Цепь NOT (+10%)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Заточка скина */}
      <div className="calcSubSection">
        <div className="stepperRow">
          <div>
            <span className="stepperTitle">Заточка скина</span>
            <small className="stepperDesc">+5% к фарму за каждую ступень (+1..+20)</small>
          </div>
          <div className="stepperControls">
            <button
              type="button"
              className="stepperBtn"
              onClick={() => updateState(s => ({ ...s, skinEnchant: Math.max(0, s.skinEnchant - 1) }))}
              disabled={state.skinEnchant <= 0}
              aria-label="Уменьшить заточку скина"
            >
              −
            </button>
            <span className="stepperVal">+{state.skinEnchant}</span>
            <button
              type="button"
              className="stepperBtn"
              onClick={() => updateState(s => ({ ...s, skinEnchant: Math.min(20, s.skinEnchant + 1) }))}
              disabled={state.skinEnchant >= 20}
              aria-label="Увеличить заточку скина"
            >
              +
            </button>
          </div>
        </div>
        <div className="chipPresets">
          {[0, 1, 3, 5, 10, 20].map(lvl => (
            <button
              key={lvl}
              type="button"
              className={`chipPreset ${state.skinEnchant === lvl ? 'active' : ''}`}
              onClick={() => updateState(s => ({ ...s, skinEnchant: lvl }))}
            >
              +{lvl} ({lvl * 5}%)
            </button>
          ))}
        </div>
      </div>

      {/* Кнопка раскрытия доп. параметров */}
      <button
        type="button"
        className="toggleAdvancedBtn"
        onClick={() => setShowAdvanced(v => !v)}
        aria-expanded={showAdvanced}
      >
        <span>{showAdvanced ? 'Скрыть кольца, артефакт и лигу' : 'Кольца, артефакт и лига...'}</span>
        <span className="advancedSummaryBadge">
          {calc.ringEnchantBonus + calc.artifactBonus + calc.leagueBonus > 0
            ? `+${calc.ringEnchantBonus + calc.artifactBonus + calc.leagueBonus}%`
            : '0%'}
        </span>
      </button>

      {showAdvanced && (
        <div className="advancedBlock">
          {/* Кольца */}
          <div className="stepperRow">
            <div>
              <span className="stepperTitle">Заточка колец (суммарно)</span>
              <small className="stepperDesc">+5% за каждый уровень каждого кольца (до 3 колец)</small>
            </div>
            <div className="stepperControls">
              <button
                type="button"
                className="stepperBtn"
                onClick={() => updateState(s => ({ ...s, ringEnchant: Math.max(0, s.ringEnchant - 1) }))}
                disabled={state.ringEnchant <= 0}
                aria-label="Уменьшить заточку колец"
              >
                −
              </button>
              <span className="stepperVal">+{state.ringEnchant}</span>
              <button
                type="button"
                className="stepperBtn"
                onClick={() => updateState(s => ({ ...s, ringEnchant: Math.min(60, s.ringEnchant + 1) }))}
                disabled={state.ringEnchant >= 60}
                aria-label="Увеличить заточку колец"
              >
                +
              </button>
            </div>
          </div>
          <div className="chipPresets">
            {[0, 3, 6, 15, 30, 60].map(lvl => (
              <button
                key={lvl}
                type="button"
                className={`chipPreset ${state.ringEnchant === lvl ? 'active' : ''}`}
                onClick={() => updateState(s => ({ ...s, ringEnchant: lvl }))}
              >
                +{lvl} ({lvl * 5}%)
              </button>
            ))}
          </div>

          {/* Монтмориллонит */}
          <button
            type="button"
            className={`slotBox artifactBox ${state.montmorillonite ? 'active' : ''}`}
            onClick={() => updateState(s => ({ ...s, montmorillonite: !s.montmorillonite }))}
            aria-pressed={state.montmorillonite}
          >
            <div className="slotBoxCheck">{state.montmorillonite ? '✓' : ''}</div>
            <div className="slotBoxInfo">
              <span className="slotBoxName">💎 Монтмориллонит</span>
              <small className="slotBoxSub">Артефакт: +10% к фарму и полное здоровье</small>
            </div>
            <strong className="slotBoxValue">+{state.montmorillonite ? 10 : 0}%</strong>
          </button>

          {/* Лига в боях */}
          <div className="leagueSelectBlock">
            <label htmlFor={`${id}-league`} className="stepperTitle">
              Лига в PvP (бонусы лиги)
            </label>
            <select
              id={`${id}-league`}
              className="leagueSelect"
              value={state.leagueIndex}
              onChange={e => updateState(s => ({ ...s, leagueIndex: Number(e.target.value) }))}
            >
              <option value={0}>Без лиги (+0%)</option>
              {battleLeagues.map(([name, mmr], i) => (
                <option key={name} value={i + 1}>
                  {name} (от {mmr.toLocaleString('ru-RU')} MMR) — +{i + 1}% к фарму
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Итоговый результат */}
      <div className="calcTotalBar">
        <div className="calcTotalBreakdown">
          <span>Скин: +{calc.skinTotal}%</span>
          {calc.totalBonus - calc.skinTotal > 0 && (
            <span> · Экип: +{calc.totalBonus - calc.skinTotal}%</span>
          )}
        </div>
        <div className="calcTotalResult">
          <small>Итого к фарму:</small>
          <strong>+{calc.totalBonus}%</strong>
        </div>
      </div>

      {showEffects && (
        <div className="calcEffectsCard">
          <h4>Что даёт этот бонус (+{calc.totalBonus}%):</h4>
          <ul className="calcEffectsList">
            <li>
              <strong>Шансы на Notcoin:</strong> дроп $NOT из всех капсул увеличен в{' '}
              <strong>{(1 + calc.totalBonus / 100).toFixed(2)}×</strong> раз.
            </li>
            <li>
              <strong>Монеты в боях:</strong> повышенная награда за победы в боях и рейдах (<code>farmCoins</code>).
            </li>
          </ul>
        </div>
      )}

      <FarmInfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
