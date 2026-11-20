import { useState } from 'react';
import { duration, speedupPrice, starPrice, type Tier } from '../domain/mechanics';
import { Price } from './Price';
import { GramEstimate } from './GamePrice';
import { GameArt } from '../ui/GameArt';
import { useGuideLocale } from './guideLocale';

const decimalRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const decimalEn = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function CapsulePrices({ tier }: { tier: Tier }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const decimal = en ? decimalEn : decimalRu;
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
  const step = Math.min(remaining, 15);
  const saving = (stars - starsAt(remaining - step)) / starPrice[tier] * 100;

  return <details className="card mediaDetails guideDisclosure calculator timeCalculator">
    <summary><GameArt path="/brand/tokens/gram.png" size={36}/>
      <span><strong>{en ? 'Opening price' : 'Цена открытия'}</strong><small>{en ? 'Stars and GRAM by remaining timer' : 'Stars и GRAM по остатку таймера'}</small></span>
    </summary>
    <div className="calculatorGrid capsuleTimeInputs">
      <label className="field">{en ? 'Hours' : 'Часы'}<input inputMode="numeric" value={inputHours} maxLength={2} placeholder="0"
        onChange={event => setInputHours(event.target.value.replace(/\D/g, ''))}/></label>
      <label className="field">{en ? 'Minutes' : 'Минуты'}<input inputMode="numeric" value={inputMinutes} maxLength={2} placeholder="0"
        onChange={event => setInputMinutes(event.target.value.replace(/\D/g, ''))}/></label>
    </div>
    <div className="capsuleResult" aria-live="polite">
      {blank ? <p>{en ? 'Enter the time from the in-game timer.' : 'Введи время с игрового таймера.'}</p> : !valid ? <p>{en ? `Enter remaining time up to ${hours} h. Minutes must be 0 to 59.` : `Введи остаток до ${hours} ч. В поле минут — от 0 до 59.`}</p> :
        remaining === 0 ? <strong>{en ? 'Ready to open for free' : 'Можно открыть бесплатно'}</strong> : <>
          <div><small>Stars</small><Price value={stars} currency="stars"/></div>
          <div><small>{en ? 'GRAM · estimate' : 'GRAM · оценка'}</small><GramEstimate stars={stars} showUnavailable/></div>
        </>}
    </div>
    {valid && !blank && remaining > 0 && <p className="caption calculatorNote">
      {en
        ? `In ${step} min −${decimal.format(saving)}% of the full Stars price.`
        : `Через ${step} мин −${decimal.format(saving)}% от полной цены в Stars.`}
    </p>}
  </details>;
}
