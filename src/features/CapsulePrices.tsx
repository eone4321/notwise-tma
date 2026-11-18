import { artSrc } from '../ui/warmArt';
import { useState } from 'react';
import { duration, speedupPrice, type Tier } from '../domain/mechanics';

function timeLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours && `${hours} ч`, rest && `${rest} мин`].filter(Boolean).join(' ') || '0 мин';
}

const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

// The game rounds GRAM up to hundredths. One displayed quote bounds the conversion rate.
function gramRange(stars: number, sampleStars: number, sampleCents: number) {
  const minimum = Math.floor(stars * (sampleCents - 1) / sampleStars) + 1;
  const maximum = Math.ceil(stars * sampleCents / sampleStars);
  return minimum === maximum ? decimal.format(minimum / 100) :
    decimal.format(minimum / 100) + '–' + decimal.format(maximum / 100);
}

export function CapsulePrices({ tier }: { tier: Tier }) {
  const totalMinutes = duration[tier] / 60_000;
  const hours = totalMinutes / 60;
  const [tableHour, setTableHour] = useState(0);
  const [inputHours, setInputHours] = useState(String(hours));
  const [inputMinutes, setInputMinutes] = useState('');
  const [quoteStars, setQuoteStars] = useState('');
  const [quoteGram, setQuoteGram] = useState('');
  const sampleStars = Number(quoteStars);
  const sampleCents = /^\d{1,5}(?:[,.]\d{1,2})?$/.test(quoteGram)
    ? Math.round(Number(quoteGram.replace(',', '.')) * 100) : 0;
  const hasSample = Number.isInteger(sampleStars) && sampleStars > 0 && sampleStars <= 2500 && sampleCents > 0;
  const remaining = Number(inputHours) * 60 + Number(inputMinutes);
  const blank = inputHours === '' && inputMinutes === '';
  const valid = remaining <= totalMinutes && Number(inputMinutes) < 60;
  const starsAt = (minutes: number) => minutes === 0 ? 0 :
    speedupPrice(tier, duration[tier] - minutes * 60_000);
  const baseGram = { dark: 1.4, silver: 7, gold: 35 }[tier];
  const estimateAt = (minutes: number) => hasSample ? gramRange(starsAt(minutes), sampleStars, sampleCents) :
    decimal.format(Math.ceil(starsAt(minutes) * baseGram * 100 / starsAt(totalMinutes) - 1e-9) / 100);
  const amounts = Array.from({ length: 13 }, (_, index) => tableHour * 60 + index * 5);
  function setRemaining(minutes: number) {
    setInputHours(String(Math.floor(minutes / 60)));
    setInputMinutes(String(minutes % 60));
  }

  return <section className="card capsulePricing">
    <h2>Сколько стоит открыть сейчас</h2>
    <p className="caption">Введи время, которое осталось на таймере игры.</p>
    <div className="quoteInputs capsuleTimeInputs">
      <label className="field">Часы<input inputMode="numeric" value={inputHours} maxLength={2} placeholder="0"
        onChange={event => setInputHours(event.target.value.replace(/\D/g, ''))}/></label>
      <label className="field">Минуты<input inputMode="numeric" value={inputMinutes} maxLength={2} placeholder="0"
        onChange={event => setInputMinutes(event.target.value.replace(/\D/g, ''))}/></label>
    </div>
    <div className="capsulePresets">{[15, 60, totalMinutes].map(minutes =>
      <button key={minutes} type="button" aria-pressed={!blank && valid && remaining === minutes}
        onClick={() => setRemaining(minutes)}>{timeLabel(minutes)}</button>)}
    </div>
    <div className="capsuleResult" aria-live="polite">
      {blank ? <p>Укажи оставшееся время.</p> : !valid ? <p>Введи время от 0 до {hours} ч. В поле минут — от 0 до 59.</p> :
        remaining === 0 ? <strong>Можно открыть бесплатно</strong> : <>
          <div><small>Telegram Stars</small><strong>{decimal.format(starsAt(remaining))} ⭐</strong></div>
          <div><small>GRAM · оценка</small><strong>≈ {estimateAt(remaining)} <img src={artSrc('/brand/tokens/gram.png')} width="16" height="16" alt="GRAM"/></strong></div>
        </>}
    </div>
    <details className="capsuleOptions"><summary>Все цены с шагом 5 минут</summary>
      <label className="field">Оставшееся время
        <select value={tableHour} onChange={event => setTableHour(Number(event.target.value))}>
          {Array.from({ length: hours }, (_, value) => <option value={value} key={value}>{timeLabel(value * 60)} – {timeLabel((value + 1) * 60)}</option>)}
        </select>
      </label>
      <table className="priceTable">
        <thead><tr><th scope="col">Осталось</th><th scope="col">Stars</th><th scope="col">GRAM · оценка</th></tr></thead>
        <tbody>{amounts.map(minutes => <tr key={minutes}><th scope="row">{timeLabel(minutes)}</th>
          <td>{minutes ? decimal.format(starsAt(minutes)) + ' ⭐' : 'Бесплатно'}</td><td>{minutes ? '≈ ' + estimateAt(minutes) : '—'}</td>
        </tr>)}</tbody>
      </table>
    </details>
    <details className="capsuleOptions"><summary>Уточнить оценку GRAM</summary>
      <p className="caption">Введи обе цены из одного окна ускорения. Игра показывает точную сумму на момент покупки.</p>
      <div className="quoteInputs">
        <label className="field">Stars<input inputMode="numeric" value={quoteStars}
          maxLength={4} placeholder="100" onChange={event => setQuoteStars(event.target.value.replace(/\D/g, ''))}/></label>
        <label className="field">GRAM<input inputMode="decimal" value={quoteGram}
          maxLength={8} placeholder="1,40" onChange={event => setQuoteGram(event.target.value)}/></label>
      </div>
      {(quoteStars || quoteGram) && !hasSample && <p className="caption">Введи обе суммы больше нуля.</p>}
    </details>
  </section>;
}
