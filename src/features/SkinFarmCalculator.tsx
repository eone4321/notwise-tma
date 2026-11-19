import { useState, useId, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
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
            <h4>На что влияет показатель фарма (Farm / farmPct)?</h4>
            <ul className="farmModalList">
              <li>
                <strong>🪙 Бонусные монеты в боях и полётах:</strong> за каждую победу в рейтинговом бою (PvP) и за успешный полёт игра начисляет дополнительные монеты (<code>farmCoins</code>), пропорциональные показателю фарма (строка <code>farm x{'{множитель}'}: +{'{монеты}'}</code> на экране победы).
              </li>
              <li>
                <strong>🦉 Статус и фарм в профиле:</strong> процент фарма виден в профиле совы (строка «Farm 100+X%») и рассчитывается напрямую игровым клиентом по формуле <code>Um = Hm(equipped, items) + Ga(mmr)</code>.
              </li>
              <li>
                <strong>💎 Внимание: дроп Notcoin ($NOT) из капсул:</strong> шанс выпадения $NOT из капсул рассчитывается отдельной функцией <code>Km</code> в <code>main.js</code>. Он зависит от <strong>уровня капсулы</strong> (+1% за уровень) и типа капсулы (dark ×1, silver ×1.5, gold ×5). Заточка колец и скин на дроп $NOT из капсул не влияют — они умножают монеты!
              </li>
            </ul>
          </section>

          <section className="farmModalSection">
            <h4>Влияет ли заточка колец и уровень совы?</h4>
            <p className="farmModalText">
              Точный расклад из декомпилированного кода клиента (функции <code>Hm</code>, <code>Um</code> и <code>Km</code> в <code>main.js</code>):
            </p>
            <ul className="farmModalList">
              <li>
                <strong>💍 Заточка колец — ДА, НАПРЯМУЮ К ФАРМУ МОНЕТ:</strong> каждое экипированное кольцо даёт боевой атрибут, а каждый уровень его заточки свитком даёт ровно <strong>+5% к показателю Farm</strong> (<code>n += um(r, e)</code>, затем <code>n * 5</code>). В инспекторе предметов <code>E8</code> на любом кольце с заточкой прямо указано <code>Farm: +X%</code>. При 3 надетых кольцах с заточкой +20 бонус к фарму монет составляет <strong>до +300%</strong>!
              </li>
              <li>
                <strong>🪶 Скин совы — ДА:</strong> 5 слотов деталей могут дать до +40% (Золотое тело +15%, цепь NOT +10%), плюс заточка скина свитками даёт <strong>+5%</strong> за каждый уровень (+1..+20, до +100%).
              </li>
              <li>
                <strong>💎 Артефакт и Лига — ДА:</strong> «Монтмориллонит» добавляет <strong>+10%</strong>, а боевая лига MMR — <strong>от +1% до +13%</strong>.
              </li>
              <li>
                <strong>🦉 Уровень капсулы влияет на $NOT:</strong> уровень совы не входит в расчёт множителя монет <code>farmPct</code> (поэтому заточка скина и колец так важна для монет). Но именно уровень капсулы входит в формулу <code>Km</code> для шанса выпадения Notcoin из капсул (+1% за каждый уровень совы) и открывает слоты под капсулы.
              </li>
            </ul>
          </section>

          <section className="farmModalSection">
            <h4>Сводная таблица множителей</h4>
            <div className="farmModalGrid">
              <div className="farmModalTile">
                <strong>Детали скина</strong>
                <span>+5% за деталь. Золотое тело: <strong>+15%</strong>, цепь NOT: <strong>+10%</strong>. Максимум: <strong>+40%</strong>.</span>
              </div>
              <div className="farmModalTile">
                <strong>Заточка скина</strong>
                <span>Свитки заточки скина: <strong>+5%</strong> за уровень (+1..+20 = до <strong>+100%</strong>).</span>
              </div>
              <div className="farmModalTile">
                <strong>Заточка колец</strong>
                <span>Свитки заточки колец: <strong>+5%</strong> за уровень каждого надетого кольца (до 3 колец по +20 = до <strong>+300%</strong>).</span>
              </div>
              <div className="farmModalTile">
                <strong>Артефакт</strong>
                <span>«Монтмориллонит» добавляет <strong>+10%</strong> к фарму и держит здоровье полным.</span>
              </div>
              <div className="farmModalTile">
                <strong>Лига в PvP</strong>
                <span>Боевой MMR даёт <strong>от +1% до +13%</strong> ко всем расчётам фарма.</span>
              </div>
            </div>
          </section>
        </div>

        <button type="button" className="farmModalButton" onClick={onClose}>
          Понятно!
        </button>
      </div>
    </div>,
    document.body
  );
}

function EnchantStepper({
  value,
  min = 0,
  max,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (val: number) => void;
  label: string;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const num = parseInt(raw.replace(/\D/g, ''), 10);
    const clamped = isNaN(num) ? min : Math.max(min, Math.min(max, num));
    setText(String(clamped));
    onChange(clamped);
  };

  return (
    <div className="stepperControls">
      <button
        type="button"
        className="stepperBtn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Уменьшить ${label} на 1`}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="stepperInput"
        value={text}
        onFocus={e => e.target.select()}
        onChange={e => {
          const raw = e.target.value.replace(/\D/g, '');
          setText(raw);
          if (raw !== '') {
            const num = parseInt(raw, 10);
            if (!isNaN(num)) {
              onChange(Math.max(min, Math.min(max, num)));
            }
          }
        }}
        onBlur={() => commit(text)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            commit(text);
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={label}
      />
      <button
        type="button"
        className="stepperBtn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Увеличить ${label} на 1`}
      >
        +
      </button>
      <span className="stepperBonus">+{value * 5}%</span>
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
              <small className="slotBoxSub">{state.hat ? 'Надет' : 'Нет детали'}</small>
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
              <small className="slotBoxSub">{state.glasses ? 'Надеты' : 'Нет детали'}</small>
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
              <small className="slotBoxSub">{state.eyes ? 'Особые' : 'Обычные'}</small>
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
                Нет
              </button>
              <button
                type="button"
                aria-pressed={state.body === 'regular'}
                onClick={() => updateState(s => ({ ...s, body: 'regular' }))}
              >
                Обычное
              </button>
              <button
                type="button"
                className="goldOption"
                aria-pressed={state.body === 'gold'}
                onClick={() => updateState(s => ({ ...s, body: 'gold' }))}
              >
                ⭐ Золотое
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
                Нет
              </button>
              <button
                type="button"
                aria-pressed={state.chest === 'regular'}
                onClick={() => updateState(s => ({ ...s, chest: 'regular' }))}
              >
                Обычное
              </button>
              <button
                type="button"
                className="chainOption"
                aria-pressed={state.chest === 'chain'}
                onClick={() => updateState(s => ({ ...s, chest: 'chain' }))}
              >
                💎 Цепь NOT
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
            <small className="stepperDesc">+5% к фарму за каждый уровень (+1..+20)</small>
          </div>
          <EnchantStepper
            value={state.skinEnchant}
            min={0}
            max={20}
            onChange={val => updateState(s => ({ ...s, skinEnchant: val }))}
            label="заточку скина"
          />
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
              <small className="stepperDesc">+5% за каждый уровень надетых колец (до 3 колец, макс +60)</small>
            </div>
            <EnchantStepper
              value={state.ringEnchant}
              min={0}
              max={60}
              onChange={val => updateState(s => ({ ...s, ringEnchant: val }))}
              label="заточку колец"
            />
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
          <small>Итого к фарму монет:</small>
          <strong>+{calc.totalBonus}%</strong>
        </div>
      </div>

      {showEffects && (
        <div className="calcEffectsCard">
          <h4>Что даёт этот бонус (+{calc.totalBonus}%):</h4>
          <ul className="calcEffectsList">
            <li>
              <strong>Бонусные монеты в боях и полётах:</strong> множитель <code>farmCoins</code> за победы в боях и финиш полётов равен <strong>{((100 + calc.totalBonus) / 100).toFixed(2)}×</strong>.
            </li>
            <li>
              <strong>Показатель «Фарм» в профиле:</strong> строка Farm отображает <strong>{100 + calc.totalBonus}%</strong> (базовые 100% + {calc.totalBonus}% бонуса).
            </li>
            <li>
              <strong>Важно о Notcoin ($NOT):</strong> заточка скина и колец даёт фарм монет, но не увеличивает шанс дропа $NOT из капсул. Шанс $NOT в коде (функция <code>Km</code>) зависит исключительно от <strong>уровня капсулы</strong> (+1% за уровень) и редкости капсулы.
            </li>
          </ul>
        </div>
      )}

      <FarmInfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
