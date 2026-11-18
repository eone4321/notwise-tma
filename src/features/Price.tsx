import { GameArt } from '../ui/GameArt';

export function Price({ value, currency }: { value: number; currency: 'coins' | 'stars' | 'squad_silver' }) {
  return <span className="priceBadge">
    <span className="sr-only">{currency === 'stars' ? 'Stars: ' : currency === 'squad_silver' ? 'Серебро: ' : 'Монеты: '}</span>
    {value.toLocaleString('ru-RU')}
    {currency === 'stars' ? <span aria-hidden="true">⭐</span> :
      <span className={currency === 'squad_silver' ? 'silverCoin' : undefined}><GameArt path="/game/items/wise-coin.webp" size={16}/></span>}
  </span>;
}
