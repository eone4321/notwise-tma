import { Link } from 'react-router';
import { artSrc } from '../ui/warmArt';

export const skinExamples = [
  { id: 5565, rarity: 'Эпический', features: 'Вишнёвое оперение, авиаторы, боло и повязка', bonus: 20 },
  { id: 6568, rarity: 'Золотой', features: 'Золотое оперение, бабочка и скорлупа', bonus: 25 },
] as const;

export function SkinExamples() {
  return <section className="skinGuide">
    <h2>Как выглядит скин и зачем он нужен</h2>
    <p>Экипируй скин, чтобы повысить шанс выпадения $NOT из капсул. Сам жетон бонуса не даёт.</p>
    <div className="skinGallery">{skinExamples.map(skin => <figure key={skin.id}>
      <img src={artSrc(`/game/skins/${skin.id}.svg`)} width="512" height="512" alt={skin.features}/>
      <figcaption><strong>{skin.rarity} №{skin.id}</strong><b>Бонус к дропу +{skin.bonus}%</b><small>{skin.features}</small></figcaption>
    </figure>)}</div>
    <dl className="skinRules">
      <div><dt>Обычный</dt><dd>Одно оперение.</dd></div>
      <div><dt>Редкий</dt><dd>Оперение и один аксессуар.</dd></div>
      <div><dt>Эпический</dt><dd>Оперение и два или больше аксессуаров.</dd></div>
      <div><dt>Золотой</dt><dd>Золотое оперение независимо от числа аксессуаров.</dd></div>
    </dl>
    <Link to="/owl/loot" className="textLink">В каких яйцах выпадают жетоны</Link>
    <p>К бонусу дропа прибавляется 5% за обычную деталь, 15% за золотое оперение и 10% за цепь NOT. Каждый уровень заточки добавляет к бонусу ещё 5%.</p>
  </section>;
}
