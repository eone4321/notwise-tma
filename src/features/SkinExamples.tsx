import { useState } from 'react';
import { DetailLink } from '../ui/DetailLink';
import { GameArt } from '../ui/GameArt';
import { artSrc } from '../ui/warmArt';

import { skinExamples, skinPartsFor, type SkinParts } from './skin-examples';

export function SkinExamples({ onUseExample }: { onUseExample: (parts: SkinParts) => void }) {
  const [selected, setSelected] = useState(0);
  const skin = skinExamples[selected];
  const bonus = skin.parts.reduce((total, [, , value]) => total + value, 0);

  return <section className="card skinShowcase">
    <h2>Облики совы</h2>
    <div className="skinStage" data-rarity={skin.rarity}>
      <div className="skinStageCopy">
        <span>{skin.rarity} · №{skin.id}</span>
        <h3>{skin.name}</h3>
        <p><strong>+{bonus}%</strong><small>к монетам без заточки</small></p>
      </div>
      <img className="skinStageArt" key={skin.id} src={artSrc(`/game/skins/${skin.id}.svg`)} width="512" height="512" alt=""/>
    </div>
    <div className="skinPicker" role="group" aria-label="Примеры обликов">
      {skinExamples.map((example, index) => <button key={example.id} type="button"
        aria-label={example.name} aria-pressed={selected === index} onClick={() => setSelected(index)}>
        <img src={artSrc(`/game/skins/${example.id}.svg`)} width="64" height="64" alt=""/>
      </button>)}
    </div>
    <dl className="skinPartValues" aria-label="Бонус от деталей выбранного облика">
      {skin.parts.map(([slot, part, value]) => <div key={slot}><dt>{part}</dt><dd>+{value}%</dd></div>)}
    </dl>
    <button type="button" className="secondary skinCalcLink" onClick={() => {
      onUseExample(skinPartsFor(skin));
      const calculator = document.getElementById('skin-calculator');
      calculator?.focus({ preventScroll: true });
      calculator?.scrollIntoView({ block: 'start' });
    }}>
      <GameArt path="/game/items/wise-coin.webp" size={18}/>Взять облик за основу
    </button>
    <details className="mediaDetails skinRuleDisclosure" id="skin-farm-rules">
      <summary><GameArt path="/game/items/scroll-enchant-skin.webp" size={27}/><strong>Как увеличить бонус</strong></summary>
      <p>Обычная деталь даёт +5%, золотое оперение +15%, цепь NOT +10%. Каждый уровень заточки добавляет ещё +5%.</p>
      <p>Золотое оперение, цепь NOT, глаза, очки и убор вместе дают +40% даже без заточки.</p>
      <DetailLink to="/assets/gear" className="textLink">Шансы заточки</DetailLink>
    </details>
  </section>;
}
