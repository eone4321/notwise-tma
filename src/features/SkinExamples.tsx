import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { DetailLink } from '../ui/DetailLink';
import { GameArt } from '../ui/GameArt';
import { artSrc } from '../ui/warmArt';

const skinExamples = [
  {
    id: 5405, name: 'Золотой с цепью', rarity: 'Золотой',
    parts: [['Золотое оперение', 15], ['Цепь NOT', 10], ['Светло-зелёные глаза', 5], ['Авиаторы', 5]],
  },
  {
    id: 701, name: 'Праздничный', rarity: 'Эпический',
    parts: [['Тёмное оперение', 5], ['Цепь NOT', 10], ['Голубые глаза', 5], ['Авиаторы', 5], ['Праздничный колпак', 5]],
  },
  {
    id: 6568, name: 'Золотой в скорлупе', rarity: 'Золотой',
    parts: [['Золотое оперение', 15], ['Бабочка', 5], ['Шапка из скорлупы', 5]],
  },
  {
    id: 5565, name: 'Вишнёвый', rarity: 'Эпический',
    parts: [['Вишнёвое оперение', 5], ['Авиаторы', 5], ['Боло', 5], ['Повязка', 5]],
  },
] as const;

export function SkinExamples() {
  const { state } = useLocation();
  const [selected, setSelected] = useState(0);
  const skin = skinExamples[selected];
  const bonus = skin.parts.reduce<number>((total, [, value]) => total + value, 0);

  return <section className="card skinShowcase">
    <h2>Облики совы</h2>
    <div className="skinStage" data-rarity={skin.rarity}>
      <div className="skinStageCopy">
        <span>{skin.rarity} · №{skin.id}</span>
        <h3>{skin.name}</h3>
        <p><strong>+{bonus}%</strong><small>монет без заточки</small></p>
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
      {skin.parts.map(([part, value]) => <div key={part}><dt>{part}</dt><dd>+{value}%</dd></div>)}
    </dl>
    <Link to="#skin-calculator" replace state={state} className="secondary skinCalcLink">
      <GameArt path="/game/items/wise-coin.webp" size={18}/>Посчитать бонус своего скина
    </Link>
    <details className="mediaDetails skinRuleDisclosure" id="skin-farm-rules">
      <summary><GameArt path="/game/items/scroll-enchant-skin.webp" size={27}/><strong>Как увеличить бонус</strong></summary>
      <p>Обычное оперение, убор, очки, глаза и обычное украшение дают по +5%. Золотое оперение даёт +15%, цепь NOT — +10%. Каждый уровень заточки добавляет ещё +5%.</p>
      <p>У облика №5405 бонус +35%. С заточкой +1 получится +40%. Столько же даёт незаточенный облик с золотым оперением, цепью NOT, глазами, очками и убором.</p>
      <DetailLink to="/assets/gear" className="textLink">Шансы заточки</DetailLink>
    </details>
  </section>;
}
