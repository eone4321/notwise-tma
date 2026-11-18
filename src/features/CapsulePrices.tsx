import { useState } from 'react';
import { duration, speedupPrice, type Tier } from '../domain/mechanics';

function timeLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours && `${hours} ч`, rest && `${rest} мин`].filter(Boolean).join(' ') || '0 мин';
}

const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

// The game rounds the GRAM quote up to hundredths. A displayed price gives
// a range of conversion rates, not a single exact rate.
function gramRange(stars: number, sampleStars: number, sampleCents: number) {
  const minimum = Math.floor(stars * (sampleCents - 1) / sampleStars) + 1;
  const maximum = Math.ceil(stars * sampleCents / sampleStars);
  return (minimum === maximum ? decimal.format(minimum / 100) :
    decimal.format(minimum / 100) + '–' + decimal.format(maximum / 100)) + ' GRAM';
}

export function CapsulePrices({ tier }: { tier: Tier }) {
  const totalMinutes = duration[tier] / 60_000;
  const hours = totalMinutes / 60;
  const [hour, setHour] = useState(0);
  const [remaining, setRemaining] = useState('');
  const [quoteStars, setQuoteStars] = useState('');
  const [quoteGram, setQuoteGram] = useState('');
  const sampleStars = Number(quoteStars);
  const sampleCents = /^\d{1,5}(?:[,.]\d{1,2})?$/.test(quoteGram)
    ? Math.round(Number(quoteGram.replace(',', '.')) * 100) : 0;
  const hasSample = Number.isInteger(sampleStars) && sampleStars > 0 && sampleStars <= 2500 && sampleCents > 0;
  const exactMinutes = Number(remaining);
  const valid = remaining !== '' && Number.isInteger(exactMinutes) && exactMinutes >= 0 && exactMinutes <= totalMinutes;
  const starsAt = (minutes: number) => minutes === 0 ? 0 :
    speedupPrice(tier, duration[tier] - minutes * 60_000);
  const priceAt = (minutes: number) => minutes === 0 ? 'Бесплатно' : starsAt(minutes).toLocaleString('ru-RU') + ' ⭐';
  const baseGram = { dark: 1.4, silver: 7, gold: 35 }[tier];
  const estimateAt = (minutes: number) => minutes === 0 ? 'Бесплатно' : hasSample
    ? gramRange(starsAt(minutes), sampleStars, sampleCents)
    : '≈ ' + decimal.format(Math.ceil(starsAt(minutes) * baseGram * 100 / starsAt(totalMinutes) - 1e-9) / 100) + ' GRAM';
  const amounts = Array.from({ length: 13 }, (_, index) => hour * 60 + index * 5);

  return <section className="card capsulePricing">
    <h2>Цена ускорения</h2>
      <label className="field">Минут осталось
        <input type="number" min="0" max={totalMinutes} step="1" inputMode="numeric" placeholder="Например, 17" value={remaining}
          onChange={event => setRemaining(event.target.value)}/>
      </label>
      {valid && <p role="status" className="priceResult">{timeLabel(exactMinutes)} осталось <strong>{priceAt(exactMinutes)}{exactMinutes > 0 && <> · {estimateAt(exactMinutes)}</>}</strong></p>}
      {remaining && !valid && <p role="status" className="caption">Введи целое число от 0 до {totalMinutes}.</p>}
      <div className="capsuleGram">
        <h3><img src="/brand/tokens/gram.png" width="18" height="18" alt=""/>Оплата в GRAM</h3>
        <p>GRAM — ориентир по данным игры. Точная цена зависит от текущего курса.</p>
        <details>
          <summary>Рассчитать по цене из игры</summary>
          <div className="quoteInputs">
            <label className="field">Stars<input inputMode="numeric" value={quoteStars}
              maxLength={4} placeholder="100" onChange={event => setQuoteStars(event.target.value)}/></label>
            <label className="field">GRAM<input inputMode="decimal" value={quoteGram}
              maxLength={8} placeholder="1,40" onChange={event => setQuoteGram(event.target.value)}/></label>
          </div>
          {hasSample ? <p className="caption">Оценка учитывает округление до сотых. При изменении игрового курса введи новые цены.</p> :
            <p className="caption">Скопируй цены из одного окна при одном и том же таймере.</p>}
        </details>
      </div>
      <details>
        <summary>Цены с шагом 5 минут</summary>
        <label className="field">Оставшееся время
          <select value={hour} onChange={event => setHour(Number(event.target.value))}>
            {Array.from({ length: hours }, (_, value) => <option value={value} key={value}>{timeLabel(value * 60)} – {timeLabel((value + 1) * 60)}</option>)}
          </select>
        </label>
        <table className="priceTable">
          <thead><tr><th scope="col">Осталось</th><th scope="col">Stars</th><th scope="col">GRAM · оценка</th></tr></thead>
          <tbody>{amounts.map(minutes => <tr key={minutes}>
            <th scope="row">{timeLabel(minutes)}</th><td>{priceAt(minutes)}</td><td>{estimateAt(minutes)}</td>
          </tr>)}</tbody>
        </table>
      </details>
  </section>;
}
