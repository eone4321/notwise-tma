import { useState } from 'react';
import { duration, speedupPrice, starPrice, type Tier } from '../domain/mechanics';
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

  return <details className="card mediaDetails guideDisclosure">
    <summary><span className="gameGlyph" aria-hidden="true">{"\ue935"}</span>
      <span><strong>Цена открытия</strong><small>Stars и GRAM по остатку таймера</small></span>
    </summary>
    <div className="quoteInputs capsuleTimeInputs">
      <label className="field">Осталось часов<input inputMode="numeric" value={inputHours} maxLength={2} placeholder="0"
        onChange={event => setInputHours(event.target.value.replace(/\D/g, ''))}/></label>
      <label className="field">Осталось минут<input inputMode="numeric" value={inputMinutes} maxLength={2} placeholder="0"
        onChange={event => setInputMinutes(event.target.value.replace(/\D/g, ''))}/></label>
    </div>
    <div className="capsuleResult" aria-live="polite">
      {blank ? <p>Введи время с игрового таймера.</p> : !valid ? <p>Введи остаток до {hours} ч. В поле минут — от 0 до 59.</p> :
        remaining === 0 ? <strong>Можно открыть бесплатно</strong> : <>
          <div><small>Telegram Stars</small><strong>{decimal.format(stars)} ⭐</strong></div>
          <div><small>GRAM · ориентир</small><strong>≈ {decimal.format(gram)} <GameArt path="/brand/tokens/gram.png" size={18}/></strong></div>
        </>}
    </div>
    {valid && !blank && remaining > 0 && <p className="caption">
      Через {step} мин цена снизится на {decimal.format(saving)}% от полной цены с учётом округления Stars.
      Точную цену в GRAM игра показывает при оплате.
    </p>}
  </details>;
}
