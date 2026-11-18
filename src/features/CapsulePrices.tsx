import { useState } from 'react';
import { duration, speedupPrice, type Tier } from '../domain/mechanics';

const minuteMs = 60_000;

function timeLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours && `${hours} ч`, rest && `${rest} мин`].filter(Boolean).join(' ') || '0 мин';
}

export function CapsulePrices({ tier }: { tier: Tier }) {
  const hours = duration[tier] / 3_600_000;
  const [hour, setHour] = useState(0);
  const [remaining, setRemaining] = useState('');
  const exactMinutes = Math.min(hours * 60, Math.max(0, Math.trunc(Number(remaining))));
  const priceAt = (minutes: number) => speedupPrice(tier, duration[tier] - minutes * minuteMs);
  const amounts = Array.from({ length: 13 }, (_, index) => hour * 60 + index * 5);

  return <section className="card capsulePricing">
    <details className="capsulePricingDetails">
      <summary><strong>Сколько стоит открыть сейчас</strong><small>Расчёт в Stars и информация об оплате в GRAM</small></summary>
    <p>Выбери диапазон, в который попадает оставшееся время на таймере капсулы.</p>
    <label className="field">Диапазон оставшегося времени
      <select value={hour} onChange={event => setHour(Number(event.target.value))}>
        {Array.from({ length: hours }, (_, value) => <option value={value} key={value}>От {timeLabel(value * 60)} до {timeLabel((value + 1) * 60)}</option>)}
      </select>
    </label>
    <table className="priceTable">
      <thead><tr><th scope="col">Осталось</th><th scope="col">Цена в Stars</th></tr></thead>
      <tbody>{amounts.map(minutes => <tr key={minutes}>
        <th scope="row">{timeLabel(minutes)}</th>
        <td>{minutes === 0 ? 'Бесплатно' : `${priceAt(minutes).toLocaleString('ru-RU')} ⭐`}</td>
      </tr>)}</tbody>
    </table>
    <details><summary>Проверить промежуточное время</summary>
      <label className="field">Сколько минут осталось
        <input type="number" min="0" max={hours * 60} step="1" placeholder="Например, 17" value={remaining}
          onChange={event => setRemaining(event.target.value)}/>
      </label>
      {remaining !== '' && <p role="status">{timeLabel(exactMinutes)} · <strong>{exactMinutes === 0 ? 'Бесплатно' : `${priceAt(exactMinutes).toLocaleString('ru-RU')} ⭐`}</strong></p>}
    </details>
    <div className="capsuleGram">
      <h3><img src="/brand/tokens/gram.png" width="18" height="18" alt=""/>Оплата в GRAM</h3>
      {tier === 'dark' && <p>В материалах гайда зафиксирован пример: <strong>1,4 GRAM</strong> при полных 4 часах таймера.</p>}
      <p>Точную сумму в GRAM смотри в окне ускорения в игре. Таблица выше рассчитывает только Stars по формуле клиента.</p>
    </div>
    </details>
  </section>;
}
