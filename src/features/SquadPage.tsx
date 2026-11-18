import { GameArt } from '../ui/GameArt';
import { shopPrice } from './shop';

export function SquadPage() {
  return <>
    <section className="card squadIntro">
      <img src="/game/war/siege-header.webp" alt="" />
      <h2>Осада и территории</h2>
      <p>Сквады доступны с 3-го уровня, война — с 4-го. Один раунд длится 8 часов. В конце раунда награду получает сквад, который удерживает территорию.</p>
    </section>
    <section className="card">
      <h2>Территории</h2>
      <ul className="compactList">{['Heart of the Forest', 'Pine Ridge', 'Moon Grove', 'Ember Glade', 'Moss Hollow', 'Old Roots'].map(name =>
        <li className="mediaRow" key={name}>{name}</li>)}</ul>
    </section>
    <section className="card">
      <h2>Как получить награду</h2>
      <p>Атакуй во время раунда, чтобы получить свою долю. Территории дают серебро сквада, обычные монеты или +1–2 к атрибуту. Усиление действует 24 часа после получения награды.</p>
    </section>
    <section className="card">
      <div className="mediaHeading"><GameArt path="/game/items/lighter.webp" size={45}/><h2>Ежедневный ритуал</h2></div>
      <p>Одно благословение тратит заряд зажигалки. Если ритуал выполняет половина сквада, участники получают бонус на сутки.</p>
      <p><strong>Зажигалка в Лавке · {shopPrice('lighter')}</strong></p>
    </section>
  </>;
}
