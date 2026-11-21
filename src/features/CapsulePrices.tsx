import { useState } from 'react';
import { duration, speedupPrice, starPrice, type Tier } from '../domain/mechanics';
import { Price } from './Price';
import { GramEstimate } from './GamePrice';
import { GameArt } from '../ui/GameArt';
import { useGuideLocale } from './guideLocale';

const decimalRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const decimalEn = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const wholeRu = new Intl.NumberFormat('ru-RU');
const wholeEn = new Intl.NumberFormat('en-US');

const timerPresets: Record<Tier, readonly { h: number; m: number; ru: string; en: string }[]> = {
  dark: [
    { h: 4, m: 0, ru: '4ч', en: '4h' },
    { h: 2, m: 0, ru: '2ч', en: '2h' },
    { h: 1, m: 0, ru: '1ч', en: '1h' },
    { h: 0, m: 30, ru: '30м', en: '30m' },
    { h: 0, m: 15, ru: '15м', en: '15m' },
  ],
  silver: [
    { h: 8, m: 0, ru: '8ч', en: '8h' },
    { h: 4, m: 0, ru: '4ч', en: '4h' },
    { h: 2, m: 0, ru: '2ч', en: '2h' },
    { h: 1, m: 0, ru: '1ч', en: '1h' },
    { h: 0, m: 15, ru: '15м', en: '15m' },
  ],
  gold: [
    { h: 24, m: 0, ru: '24ч', en: '24h' },
    { h: 12, m: 0, ru: '12ч', en: '12h' },
    { h: 6, m: 0, ru: '6ч', en: '6h' },
    { h: 1, m: 0, ru: '1ч', en: '1h' },
    { h: 0, m: 15, ru: '15м', en: '15m' },
  ],
};

export function CapsulePrices({ tier }: { tier: Tier }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const decimal = en ? decimalEn : decimalRu;
  const whole = en ? wholeEn : wholeRu;
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
  const presets = timerPresets[tier];

  return <details className="card mediaDetails guideDisclosure calculator timeCalculator">
    <summary><GameArt path="/brand/tokens/gram.png" size={36}/>
      <span>
        <strong>{en ? 'Opening price' : 'Цена открытия'}</strong>
        <small>{en ? `Up to ${whole.format(starPrice[tier])} ⭐ · by remaining timer` : `До ${whole.format(starPrice[tier])} ⭐ · по остатку таймера`}</small>
      </span>
    </summary>
    <div className="capsulePresets" role="group" aria-label={en ? 'Quick timer presets' : 'Быстрый выбор остатка таймера'}>
      {presets.map(preset => {
        const active = !blank && valid && remaining === preset.h * 60 + preset.m;
        return (
          <button
            key={`${preset.h}:${preset.m}`}
            type="button"
            aria-pressed={active}
            onClick={() => {
              setInputHours(preset.h > 0 ? String(preset.h) : '');
              setInputMinutes(preset.m > 0 ? String(preset.m) : '');
            }}
          >
            {en ? preset.en : preset.ru}
          </button>
        );
      })}
    </div>
    <div className="calculatorGrid capsuleTimeInputs">
      <label className="field">{en ? 'Hours' : 'Часы'}<input inputMode="numeric" value={inputHours} maxLength={2} placeholder="0"
        onChange={event => setInputHours(event.target.value.replace(/\D/g, ''))}/></label>
      <label className="field">{en ? 'Minutes' : 'Минуты'}<input inputMode="numeric" value={inputMinutes} maxLength={2} placeholder="0"
        onChange={event => setInputMinutes(event.target.value.replace(/\D/g, ''))}/></label>
    </div>
    <div className="capsuleResult" aria-live="polite">
      {blank ? <p>{en ? 'Enter the time from the in-game timer.' : 'Введи время с игрового таймера.'}</p> : !valid ? <p>{en ? `Enter remaining time up to ${hours} h. Minutes must be 0 to 59.` : `Введи остаток до ${hours}ч. В поле минут — от 0 до 59.`}</p> :
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
