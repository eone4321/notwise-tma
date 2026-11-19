import { useState } from 'react';
import { duration, speedupPrice, starPrice, type Tier } from '../domain/mechanics';
import { Price } from './Price';
import { GameArt } from '../ui/GameArt';

const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const fullGram = { dark: 1.4, silver: 7, gold: 35 };

export function CapsulePrices({ tier }: { tier: Tier }) {
  const totalMinutes = duration[tier] / 60_000;
  const hours = totalMinutes / 60;
  const [inputHours, setInputHours] = useState(String(hours));
  const [inputMinutes, setInputMinutes] = useState('');
  const remaining = Number(inputHours) * 60 + Number(inputMinutes);
  const blank = inputHours === '' && inputMinutes === '';
  const valid = remaining <= totalMinutes && Number(inputMinutes) < 60;
  const starsAt = (minutes: number) => minutes === 0 ? 0 :
    speedupPrice(tier, duration[tier] - minutes * 60_000);
  const stars = starsAt(remaining);
  const gram = Math.ceil(stars * fullGram[tier] * 100 / starPrice[tier] - 1e-9) / 100;
  const step = Math.min(remaining, 15);
  const saving = (stars - starsAt(remaining - step)) / starPrice[tier] * 100;

  return <details className="card mediaDetails guideDisclosure calculator timeCalculator">
    <summary><GameArt path="/brand/tokens/gram.png" size={36}/>
      <span><strong>Цена открытия</strong><small>Stars и GRAM по остатку таймера</small></span>
    </summary>
    <div className="calculatorGrid capsuleTimeInputs">
      <label className="field">Часы<input inputMode="numeric" value={inputHours} maxLength={2} placeholder="0"
        onChange={event => setInputHours(event.target.value.replace(/\D/g, ''))}/></label>
      <label className="field">Минуты<input inputMode="numeric" value={inputMinutes} maxLength={2} placeholder="0"
        onChange={event => setInputMinutes(event.target.value.replace(/\D/g, ''))}/></label>
    </div>
    <div className="capsuleResult" aria-live="polite">
      {blank ? <p>Введи время с игрового таймера.</p> : !valid ? <p>Введи остаток до {hours} ч. В поле минут — от 0 до 59.</p> :
        remaining === 0 ? <strong>Можно открыть бесплатно</strong> : <>
          <div><small>Stars</small><Price value={stars} currency="stars"/></div>
          <div><small>GRAM · оценка</small><Price value={gram} currency="gram" approximate/></div>
        </>}
    </div>
    {valid && !blank && remaining > 0 && <p className="caption calculatorNote">
      Через {step} мин −{decimal.format(saving)}% от полной цены в Stars.
    </p>}
  </details>;
}
