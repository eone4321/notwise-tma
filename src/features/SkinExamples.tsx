import { DetailLink } from '../ui/DetailLink';
import { artSrc } from '../ui/warmArt';
import { GameArt } from '../ui/GameArt';
import { Link, useLocation } from 'react-router';

export const skinExamples = [
  { id: 701, rarity: 'Эпический', features: 'Тёмное оперение, цепь NOT, голубые глаза, авиаторы и праздничный колпак', bonus: 30 },
  { id: 5405, rarity: 'Золотой', features: 'Золотое оперение, цепь NOT, светло-зелёные глаза и авиаторы', bonus: 35 },
  { id: 6568, rarity: 'Золотой', features: 'Золотое оперение, бабочка и скорлупа', bonus: 25 },
  { id: 5565, rarity: 'Эпический', features: 'Вишнёвое оперение, авиаторы, боло и повязка', bonus: 20 },
] as const;

export function SkinExamples() {
  const { state } = useLocation();
  return <>
    <section className="card skinGuide">
      <h2>Скины совы</h2>
      <p>Детали скина и заточка увеличивают награду в монетах за победы и полёты.</p>
      <Link to="#skin-calculator" replace state={state} className="textLink">Посчитать свой бонус</Link>
      <div className="skinGallery">{skinExamples.map(skin => <figure key={skin.id}>
        <div className="skinPreview">
          <img src={artSrc(`/game/skins/${skin.id}.svg`)} width="512" height="512" alt=""/>
          <b>+{skin.bonus}% к фарму</b>
        </div>
        <figcaption><strong>{skin.rarity} · №{skin.id}</strong><small>{skin.features}</small></figcaption>
      </figure>)}</div>
    </section>
    <section className="card">
      <h2>Из чего складывается бонус</h2>
      <dl className="analyticsRows skinBonuses">
        <div><dt>Обычное оперение или аксессуар</dt><dd>+5%</dd></div>
        <div><dt>Золотое оперение</dt><dd>+15%</dd></div>
        <div><dt>Цепь NOT</dt><dd>+10%</dd></div>
        <div><dt><GameArt path="/game/items/scroll-enchant-skin.webp" size={26}/> За уровень заточки</dt><dd>+5%</dd></div>
      </dl>
      <p>Золотое оперение, цепь NOT и один обычный аксессуар дают +30%. С заточкой +1 получится +35%. У скина №5405 заточка +1 поднимает бонус с +35% до +40%. Без заточки +40% дают золотое оперение, цепь NOT, глаза, очки и головной убор.</p>
      <DetailLink to="/assets/gear" className="textLink">Как заточить скин</DetailLink>
    </section>
  </>;
}
