import { useState } from 'react';
import { duration, speedupPrice, type Tier } from '../domain/mechanics';

function timeLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours && `${hours} ч`, rest && `${rest} мин`].filter(Boolean).join(' ') || '0 мин';
}

export function CapsulePrices({ tier }: { tier: Tier }) {
  const totalMinutes = duration[tier] / 60_000;
  const hours = totalMinutes / 60;
  const [hour, setHour] = useState(0);
  const [remaining, setRemaining] = useState('');
  const exactMinutes = Number(remaining);
  const valid = remaining !== '' && Number.isInteger(exactMinutes) && exactMinutes >= 0 && exactMinutes <= totalMinutes;
  const priceAt = (minutes: number) => minutes === 0 ? 'Бесплатно' :
    speedupPrice(tier, duration[tier] - minutes * 60_000).toLocaleString('ru-RU') + ' ⭐';
  const amounts = Array.from({ length: 13 }, (_, index) => hour * 60 + index * 5);

  return <section className="card capsulePricing">
    <details className="capsulePricingDetails">
      <summary><strong>Сколько стоит открыть сейчас?</strong><small>Расчёт по времени, оставшемуся на таймере</small></summary>
      <label className="field">Минут осталось
        <input type="number" min="0" max={totalMinutes} step="1" inputMode="numeric" placeholder="Например, 17" value={remaining}
          onChange={event => setRemaining(event.target.value)}/>
      </label>
      {valid && <p role="status" className="priceResult">{timeLabel(exactMinutes)} осталось <strong>{priceAt(exactMinutes)}</strong></p>}
      {remaining && !valid && <p role="status" className="caption">Введи целое число от 0 до {totalMinutes}.</p>}
      <div className="capsuleGram">
        <h3><img src="/brand/tokens/gram.png" width="18" height="18" alt=""/>Оплата в GRAM</h3>
        <p>{tier === 'dark' && <>При полных 4 ч зафиксирована цена <strong>1,4 GRAM</strong>. </>}Текущую сумму в GRAM показывает окно ускорения в игре.</p>
      </div>
      <details>
        <summary>Цены в Stars с шагом 5 минут</summary>
        <label className="field">Оставшееся время
          <select value={hour} onChange={event => setHour(Number(event.target.value))}>
            {Array.from({ length: hours }, (_, value) => <option value={value} key={value}>{timeLabel(value * 60)} – {timeLabel((value + 1) * 60)}</option>)}
          </select>
        </label>
        <table className="priceTable">
          <thead><tr><th scope="col">Осталось</th><th scope="col">Цена</th></tr></thead>
          <tbody>{amounts.map(minutes => <tr key={minutes}>
            <th scope="row">{timeLabel(minutes)}</th><td>{priceAt(minutes)}</td>
          </tr>)}</tbody>
        </table>
      </details>
    </details>
  </section>;
}
