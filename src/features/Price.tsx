import { GameArt } from '../ui/GameArt';

const labels = { coins: 'Монеты', stars: 'Stars', squad_silver: 'Серебро сквада', gram: 'GRAM', not: '$NOT' };
export type Currency = keyof typeof labels;
const icons = {
  coins: '/game/items/wise-coin.webp',
  squad_silver: '/game/items/wise-coin.webp',
  gram: '/brand/tokens/gram.png',
  not: '/brand/tokens/not.webp',
};

export function Price({ value, currency }: { value: number; currency: Currency }) {
  return <span className="priceBadge">
    <span className="sr-only">{labels[currency]}: </span>
    {value.toLocaleString('ru-RU')}
    {currency === 'stars' ? <span aria-hidden="true">⭐</span> :
      <span className={currency === 'squad_silver' ? 'silverCoin' : undefined}>
        <GameArt path={icons[currency]} size={16}/>
      </span>}
  </span>;
}
