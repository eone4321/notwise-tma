import { useState } from 'react';
import { Link } from 'react-router';
import { GameArt } from '../ui/GameArt';
import { assetGroups, dropsFor, itemNames } from './inventory';

const eggs = [
  { id: 17, name: 'Загадочное яйцо', appearance: 'Синий фон' },
  { id: 18, name: 'Яйцо на зелёном фоне' },
  { id: 19, name: 'Яйцо на красном фоне' },
  { id: 20, name: 'Яйцо на золотом фоне' },
] as const;
const otherEggs = [{ id: 56, name: 'Вариант №56' }, { id: 61, name: 'Вариант №61' }];

function chancePerOpening(percent: number) {
  const miss = 1 - percent / 100;
  return 100 * (0.8 * (1 - miss) + 0.15 * (1 - miss ** 2) + 0.05 * (1 - miss ** 3));
}
const missingItemArt = new Set([50, 52, 53, 54]);
const pct = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });

export function OwlPage() {
  const [egg, setEgg] = useState<number | null>(null);
  const selected = [...eggs, ...otherEggs].find(item => item.id === egg);
  return <>
    <p className="intro">Яйца дают предметы. Еда поддерживает сытость совы и помогает избежать штрафа к наградам.</p>
    <section className="card">
      <h2>Что выпадает из яйца</h2>
      <p>Выбери яйцо по картинке из игры.</p>
      <div className="eggPicker" aria-label="Выбрать яйцо">
        {eggs.map(item => <button type="button" key={item.id} aria-pressed={egg === item.id}
          aria-controls="egg-loot" onClick={() => setEgg(item.id)}>
          <GameArt path={`/game/items/${item.id}.png`} size={64}/>
          <strong>{item.name}</strong>
          {'appearance' in item && <small>{item.appearance}</small>}
        </button>)}
      </div>
      <details className="eggVariants">
        <summary>Другие варианты из бандла</summary>
        <p className="caption">У этих вариантов известны наборы наград, но названия и изображения в открытом каталоге не подтвердились.</p>
        <div className="choiceBar">
          {otherEggs.map(item => <button type="button" key={item.id} aria-pressed={egg === item.id}
            aria-controls="egg-loot" onClick={() => setEgg(item.id)}>{item.name}</button>)}
        </div>
      </details>
      <div id="egg-loot">
        {selected && <div className="eggLoot">
          <h3>{selected.name}</h3>
          <p className="caption">Шанс получить предмет хотя бы раз за открытие. По базовым настройкам игра делает один, два или три броска.</p>
          {dropsFor(selected.id).map(([id, chance]) => {
            const [name, file] = itemNames[id];
            return <div className="mediaRow" key={id}>
              {missingItemArt.has(id)
                ? <span className="gameArt itemNumber" aria-hidden="true">№{id}</span>
                : <GameArt path={`/game/items/${file ?? id + '.png'}`} size={40}/>}
              <span>{name}</span><strong>{pct.format(chancePerOpening(chance))}%</strong>
            </div>;
          })}
        </div>}
      </div>
    </section>
    <section className="card">
      <div className="mediaHeading"><GameArt path="/game/items/croissant.webp" size={64}/><div><h2>Как избежать голода</h2><p>Корми сову хотя бы раз в три дня. Любимая еда даёт вдвое больше сытости. Максимум сытости — 20.</p></div></div>
      <p>Голод вдвое снижает монеты, опыт и скорость восстановления здоровья и энергии на 24 часа. Если сова продолжает голодать, штраф может продлиться.</p>
      <Link className="textLink" to="/assets">Еда, таблетки и другие предметы →</Link>
    </section>
  </>;
}

export function InventoryPage() {
  return <>
    <p className="intro">Что хранится в инвентаре совы и когда это пригодится.</p>
    {assetGroups.map(([group, items]) => <section className="card" key={group}>
      <h2>{group}</h2>
      {items.map(([file, title, use]) => <div className="mediaRow" key={file}>
        <GameArt path={`/game/items/${file}`}/>
        <div><h3>{title}</h3><p>{use}</p></div>
      </div>)}
    </section>)}
    <section className="card">
      <h2>Награды для коллекции</h2>
      <div className="mediaRow"><GameArt path="/game/capsules/gold.webp"/><div>
        <h3>Капсулы</h3><p>Занимают слот до открытия. Дают опыт и монеты, иногда яйцо, стикерпак или Notcoin.</p>
        <Link className="textLink" to="/capsules">Виды капсул и шансы →</Link>
      </div></div>
      <div className="mediaRow"><GameArt path="/game/stickers/1.webp"/><div>
        <h3>Стикеры</h3><p>Заполняют игровые альбомы. Часть стикеров выпадает из наборов, остальные дают за достижения и секреты.</p>
        <Link className="textLink" to="/collections">Открыть альбомы →</Link>
      </div></div>
    </section>
    <section className="card">
      <h2>Где взять нужный предмет?</h2>
      <details><summary>Где купить еду и расходники?</summary><p>В обычном разделе Лавки за игровые монеты. Отдельные вкладки предлагают товары за Stars, валюту сквада и $NOT.</p></details>
      <details><summary>Зачем копить осколки?</summary><p>Открой осколки в инвентаре, чтобы посмотреть доступные рецепты и стоимость крафта.</p></details>
      <details><summary>Как увеличить шанс выпадения $NOT?</summary><p>Проверь бонус к фарму в профиле. На него влияют части скина, заточка скина и колец, артефакт и боевая лига. Введи значение из профиля в разделе капсул, чтобы сравнить шансы.</p><Link className="textLink" to="/capsules">Шансы в капсулах →</Link></details>
    </section>
    <Link className="textLink" to="/owl">Посмотреть, что выпадает из яиц →</Link>
  </>;
}
