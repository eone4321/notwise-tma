import { GameArt } from '../ui/GameArt';

const labels = { coins: 'Монеты', stars: 'Stars', squad_silver: 'Серебро сквада', gram: 'GRAM', not: '$NOT', shards: 'Осколки скорлупы' };
export type Currency = keyof typeof labels;
const icons = {
  coins: '/game/items/wise-coin.webp',
  squad_silver: '/game/items/wise-coin.webp',
  gram: '/brand/tokens/gram.png',
  not: '/brand/tokens/not.webp',
  shards: '/game/items/eggshell-shards-icon.webp',
};

export function Price({ value, currency, from, approximate }: { value: number; currency: Currency; from?: boolean; approximate?: boolean }) {
  return <span className="priceBadge" data-currency={currency}>
    <span className="sr-only">{labels[currency]}: </span>
    <span className="priceVal">{from ? 'от ' : approximate ? '≈ ' : ''}{value.toLocaleString('ru-RU')}</span>
    {currency === 'stars' ? (
      <span className="priceIcon starIcon" aria-hidden="true">⭐</span>
    ) : (
      <span className={`priceIcon ${currency === 'squad_silver' ? 'silverCoin' : ''}`}>
        <GameArt path={icons[currency]} size={16}/>
      </span>
    )}
  </span>;
}
